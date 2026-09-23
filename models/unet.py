"""
U-Net for DDPM (built from scratch)
--------------------------------------
Implements the noise-prediction network used by Denoising Diffusion
Probabilistic Models (Ho et al., 2020 - see literature survey).

Architecture: sinusoidal time embedding -> ResBlocks with time conditioning
-> downsampling path -> bottleneck with self-attention -> upsampling path
with skip connections -> final conv to predict noise.

No pretrained weights are used anywhere in this file - every layer is
randomly initialized and learns entirely from your training data.
"""

import math
import torch
import torch.nn as nn


def sinusoidal_time_embedding(timesteps: torch.Tensor, dim: int) -> torch.Tensor:
    """Classic transformer-style sinusoidal embedding, used to encode the
    diffusion timestep so the network knows 'how noisy' the input is."""
    half = dim // 2
    freqs = torch.exp(
        -math.log(10000) * torch.arange(half, device=timesteps.device).float() / half
    )
    args = timesteps[:, None].float() * freqs[None, :]
    embedding = torch.cat([torch.sin(args), torch.cos(args)], dim=-1)
    if dim % 2 == 1:
        embedding = torch.nn.functional.pad(embedding, (0, 1))
    return embedding


class ResBlock(nn.Module):
    """Residual block conditioned on the timestep embedding."""

    def __init__(self, in_ch: int, out_ch: int, time_dim: int):
        super().__init__()
        self.norm1 = nn.GroupNorm(8, in_ch)
        self.conv1 = nn.Conv2d(in_ch, out_ch, 3, padding=1)
        self.time_proj = nn.Linear(time_dim, out_ch)
        self.norm2 = nn.GroupNorm(8, out_ch)
        self.conv2 = nn.Conv2d(out_ch, out_ch, 3, padding=1)
        self.skip = nn.Conv2d(in_ch, out_ch, 1) if in_ch != out_ch else nn.Identity()
        self.act = nn.SiLU()

    def forward(self, x, t_emb):
        h = self.conv1(self.act(self.norm1(x)))
        h = h + self.time_proj(self.act(t_emb))[:, :, None, None]
        h = self.conv2(self.act(self.norm2(h)))
        return h + self.skip(x)


class SelfAttention(nn.Module):
    """Simple self-attention block, applied at the bottleneck resolution."""

    def __init__(self, channels: int):
        super().__init__()
        self.norm = nn.GroupNorm(8, channels)
        self.qkv = nn.Conv2d(channels, channels * 3, 1)
        self.proj = nn.Conv2d(channels, channels, 1)

    def forward(self, x):
        B, C, H, W = x.shape
        h = self.norm(x)
        q, k, v = self.qkv(h).chunk(3, dim=1)
        q = q.reshape(B, C, H * W).permute(0, 2, 1)
        k = k.reshape(B, C, H * W)
        v = v.reshape(B, C, H * W).permute(0, 2, 1)

        attn = torch.softmax(q @ k / math.sqrt(C), dim=-1)
        out = (attn @ v).permute(0, 2, 1).reshape(B, C, H, W)
        return x + self.proj(out)


class Down(nn.Module):
    def __init__(self, ch):
        super().__init__()
        self.op = nn.Conv2d(ch, ch, 3, stride=2, padding=1)

    def forward(self, x):
        return self.op(x)


class Up(nn.Module):
    def __init__(self, ch):
        super().__init__()
        self.op = nn.ConvTranspose2d(ch, ch, 4, stride=2, padding=1)

    def forward(self, x):
        return self.op(x)


class UNet(nn.Module):
    """
    Compact U-Net sized for a 6GB GPU at 64x64 resolution.
    channel_mults controls depth/width - kept small on purpose so training
    is feasible on a laptop GPU within a reasonable number of hours.

    Class-conditional: if num_classes is set, a learned embedding for the
    requested class is added to the timestep embedding, so the network can
    be told "generate a banana" vs "generate an orange" instead of only
    producing a random class. This is still not open-vocabulary text-to-image
    (there's no language understanding here) - it's conditioning on a fixed
    set of known classes, which text prompts get mapped onto elsewhere.
    """

    def __init__(
        self,
        in_channels: int = 3,
        base_channels: int = 64,
        channel_mults: tuple = (1, 2, 4),
        time_dim: int = 256,
        num_classes: int = 0,
    ):
        super().__init__()
        self.time_dim = time_dim
        self.num_classes = num_classes
        self.time_mlp = nn.Sequential(
            nn.Linear(time_dim, time_dim * 4),
            nn.SiLU(),
            nn.Linear(time_dim * 4, time_dim),
        )

        if num_classes > 0:
            # +1 reserves an index for "no class" (unconditional) generation,
            # so old-style random sampling still works if y is omitted.
            self.class_emb = nn.Embedding(num_classes + 1, time_dim)
        else:
            self.class_emb = None

        self.in_conv = nn.Conv2d(in_channels, base_channels, 3, padding=1)

        # Down path
        chs = [base_channels]
        ch = base_channels
        self.down_blocks = nn.ModuleList()
        self.downsamples = nn.ModuleList()
        for i, mult in enumerate(channel_mults):
            out_ch = base_channels * mult
            self.down_blocks.append(ResBlock(ch, out_ch, time_dim))
            ch = out_ch
            chs.append(ch)
            if i != len(channel_mults) - 1:
                self.downsamples.append(Down(ch))
            else:
                self.downsamples.append(nn.Identity())

        # Bottleneck
        self.mid_block1 = ResBlock(ch, ch, time_dim)
        self.mid_attn = SelfAttention(ch)
        self.mid_block2 = ResBlock(ch, ch, time_dim)

        # Up path
        self.up_blocks = nn.ModuleList()
        self.upsamples = nn.ModuleList()
        for i, mult in reversed(list(enumerate(channel_mults))):
            out_ch = base_channels * mult
            skip_ch = chs.pop()
            self.up_blocks.append(ResBlock(ch + skip_ch, out_ch, time_dim))
            ch = out_ch
            if i != 0:
                self.upsamples.append(Up(ch))
            else:
                self.upsamples.append(nn.Identity())

        self.out_norm = nn.GroupNorm(8, ch)
        self.out_conv = nn.Conv2d(ch, in_channels, 3, padding=1)
        self.act = nn.SiLU()

    def forward(self, x, t, y=None):
        t_emb = sinusoidal_time_embedding(t, self.time_dim)
        t_emb = self.time_mlp(t_emb)

        if self.class_emb is not None:
            if y is None:
                # "no class" index -> unconditional generation
                y = torch.full((x.shape[0],), self.num_classes, device=x.device, dtype=torch.long)
            t_emb = t_emb + self.class_emb(y)

        h = self.in_conv(x)
        skips = [h]
        for block, down in zip(self.down_blocks, self.downsamples):
            h = block(h, t_emb)
            skips.append(h)
            h = down(h)

        h = self.mid_block1(h, t_emb)
        h = self.mid_attn(h)
        h = self.mid_block2(h, t_emb)

        for block, up in zip(self.up_blocks, self.upsamples):
            skip = skips.pop()
            if h.shape[-2:] != skip.shape[-2:]:
                h = nn.functional.interpolate(h, size=skip.shape[-2:])
            h = torch.cat([h, skip], dim=1)
            h = block(h, t_emb)
            h = up(h)

        return self.out_conv(self.act(self.out_norm(h)))
