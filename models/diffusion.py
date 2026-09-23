"""
DDPM Diffusion Process (built from scratch)
-----------------------------------------------
Implements the forward noising process, training loss, and reverse
sampling loop from "Denoising Diffusion Probabilistic Models"
(Ho et al., 2020) - the exact algorithm cited in your literature survey.

Forward process: q(x_t | x_0) progressively adds Gaussian noise.
Reverse process: the U-Net learns to predict the noise added at each
step, and we iteratively denoise starting from pure noise to generate
a new image.
"""

import torch
import torch.nn.functional as F


class DDPM:
    def __init__(
        self,
        model: torch.nn.Module,
        timesteps: int = 1000,
        beta_start: float = 1e-4,
        beta_end: float = 0.02,
        device: str = "cuda",
    ):
        self.model = model.to(device)
        self.timesteps = timesteps
        self.device = device

        # Linear noise schedule (as in the original DDPM paper)
        self.betas = torch.linspace(beta_start, beta_end, timesteps).to(device)
        self.alphas = 1.0 - self.betas
        self.alphas_cumprod = torch.cumprod(self.alphas, dim=0)
        self.sqrt_alphas_cumprod = torch.sqrt(self.alphas_cumprod)
        self.sqrt_one_minus_alphas_cumprod = torch.sqrt(1.0 - self.alphas_cumprod)

    def q_sample(self, x0: torch.Tensor, t: torch.Tensor, noise: torch.Tensor = None):
        """Forward process: adds noise to a clean image x0 at timestep t."""
        if noise is None:
            noise = torch.randn_like(x0)
        sqrt_ac = self.sqrt_alphas_cumprod[t][:, None, None, None]
        sqrt_om = self.sqrt_one_minus_alphas_cumprod[t][:, None, None, None]
        return sqrt_ac * x0 + sqrt_om * noise, noise

    def training_loss(self, x0: torch.Tensor, y: torch.Tensor = None) -> torch.Tensor:
        """
        One training step: sample a random timestep, noise the image,
        and train the U-Net to predict the noise that was added.
        This is the entire DDPM training objective (simple MSE loss).

        y: optional (batch,) tensor of class labels, for class-conditional
        training. Passed straight through to the model.
        """
        b = x0.shape[0]
        t = torch.randint(0, self.timesteps, (b,), device=self.device).long()
        x_noisy, noise = self.q_sample(x0, t)
        predicted_noise = self.model(x_noisy, t, y)
        return F.mse_loss(predicted_noise, noise)

    @torch.no_grad()
    def sample(self, image_size: int, channels: int = 3, batch_size: int = 1, y: torch.Tensor = None):
        """
        Reverse process: starts from pure Gaussian noise and iteratively
        denoises it step-by-step using the trained model, producing a
        new generated image.

        y: optional (batch_size,) tensor of class labels. If the model is
        class-conditional and y is provided, every step is conditioned on
        that class, so the output is (roughly) that specific fruit rather
        than a random one.
        """
        self.model.eval()
        x = torch.randn(batch_size, channels, image_size, image_size, device=self.device)

        for t_step in reversed(range(self.timesteps)):
            t = torch.full((batch_size,), t_step, device=self.device, dtype=torch.long)
            predicted_noise = self.model(x, t, y)

            alpha = self.alphas[t_step]
            alpha_cumprod = self.alphas_cumprod[t_step]
            beta = self.betas[t_step]

            if t_step > 0:
                noise = torch.randn_like(x)
            else:
                noise = torch.zeros_like(x)

            x = (1 / torch.sqrt(alpha)) * (
                x - ((1 - alpha) / torch.sqrt(1 - alpha_cumprod)) * predicted_noise
            ) + torch.sqrt(beta) * noise

        self.model.train()
        x = x.clamp(-1, 1)
        return (x + 1) / 2  # rescale from [-1,1] to [0,1] for saving as an image

    @torch.no_grad()
    def ddim_sample(self, image_size: int, channels: int = 3, batch_size: int = 1,
                     y: torch.Tensor = None, num_steps: int = 50, eta: float = 0.0,
                     progress_callback=None):
        """
        Fast reverse process using DDIM (Denoising Diffusion Implicit Models,
        Song et al. 2020). Same trained model, same checkpoint - just skips
        most of the 1000 training timesteps at inference time by taking a
        strided subsequence of them (e.g. 50 evenly-spaced steps instead of
        all 1000), which gives a large speedup (~20x for 50 steps) with
        comparable visual quality. No retraining needed.

        eta=0 is fully deterministic DDIM (fastest, most stable). Increase
        toward 1.0 for more stochastic, DDPM-like sampling (slightly more
        varied results, marginally slower to stabilize per-step).

        progress_callback(current_step, total_steps), if given, is called
        after each denoising step - used to report live progress (e.g. to
        a polling API endpoint) without needing this method to know
        anything about HTTP or job tracking.
        """
        self.model.eval()
        x = torch.randn(batch_size, channels, image_size, image_size, device=self.device)

        # Evenly-spaced subsequence of the original 1000 timesteps
        step_indices = torch.linspace(0, self.timesteps - 1, num_steps).long()
        step_indices = torch.unique(step_indices, sorted=True)
        total = len(step_indices)

        for i in reversed(range(len(step_indices))):
            current_step = total - i
            print(f"[diffusion] sampling step {current_step}/{total}...", flush=True)
            if progress_callback is not None:
                progress_callback(current_step, total)
            t_step = step_indices[i].item()
            t_prev_step = step_indices[i - 1].item() if i > 0 else -1

            t = torch.full((batch_size,), t_step, device=self.device, dtype=torch.long)
            predicted_noise = self.model(x, t, y)

            alpha_cumprod_t = self.alphas_cumprod[t_step]
            alpha_cumprod_prev = self.alphas_cumprod[t_prev_step] if t_prev_step >= 0 else torch.tensor(1.0, device=self.device)

            predicted_x0 = (x - torch.sqrt(1 - alpha_cumprod_t) * predicted_noise) / torch.sqrt(alpha_cumprod_t)
            predicted_x0 = predicted_x0.clamp(-1, 1)

            sigma = eta * torch.sqrt(
                (1 - alpha_cumprod_prev) / (1 - alpha_cumprod_t) * (1 - alpha_cumprod_t / alpha_cumprod_prev)
            ) if t_prev_step >= 0 else torch.tensor(0.0, device=self.device)

            direction = torch.sqrt(torch.clamp(1 - alpha_cumprod_prev - sigma ** 2, min=0.0)) * predicted_noise
            noise = torch.randn_like(x) if (eta > 0 and t_prev_step >= 0) else torch.zeros_like(x)

            x = torch.sqrt(alpha_cumprod_prev) * predicted_x0 + direction + sigma * noise

        self.model.train()
        x = x.clamp(-1, 1)
        return (x + 1) / 2