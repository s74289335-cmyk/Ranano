import cv2
from pathlib import Path


# ============================================================
# RANANO - EDSR x4 SUPER RESOLUTION TEST
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

INPUT_IMAGE = BASE_DIR / "test_input.png"
MODEL_PATH = BASE_DIR / "models" / "EDSR_x4.pb"
OUTPUT_IMAGE = BASE_DIR / "test_output_edsr.png"


def main():

    print("=" * 60)
    print("RANANO EDSR SUPER-RESOLUTION TEST")
    print("=" * 60)

    # --------------------------------------------------------
    # Check files
    # --------------------------------------------------------

    if not INPUT_IMAGE.exists():
        raise FileNotFoundError(
            f"Input image not found:\n{INPUT_IMAGE}"
        )

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"EDSR model not found:\n{MODEL_PATH}"
        )

    print(f"Input : {INPUT_IMAGE}")
    print(f"Model : {MODEL_PATH}")

    # --------------------------------------------------------
    # Load image
    # --------------------------------------------------------

    image = cv2.imread(
        str(INPUT_IMAGE),
        cv2.IMREAD_COLOR
    )

    if image is None:
        raise RuntimeError(
            "OpenCV could not read the input image."
        )

    height, width = image.shape[:2]

    print()
    print(f"Input resolution : {width} x {height}")

    # --------------------------------------------------------
    # Create EDSR
    # --------------------------------------------------------

    print()
    print("Loading EDSR x4...")

    sr = cv2.dnn_superres.DnnSuperResImpl_create()

    sr.readModel(
        str(MODEL_PATH)
    )

    sr.setModel(
        "edsr",
        4
    )

    # CPU
    sr.setPreferableBackend(
        cv2.dnn.DNN_BACKEND_OPENCV
    )

    sr.setPreferableTarget(
        cv2.dnn.DNN_TARGET_CPU
    )

    print("EDSR loaded successfully.")
    print("Backend : OpenCV")
    print("Target  : CPU")

    # --------------------------------------------------------
    # Run super resolution
    # --------------------------------------------------------

    print()
    print("Running EDSR x4...")
    print("This may take a little while on CPU.")

    result = sr.upsample(image)

    # --------------------------------------------------------
    # Save result
    # --------------------------------------------------------

    result_height, result_width = result.shape[:2]

    success = cv2.imwrite(
        str(OUTPUT_IMAGE),
        result
    )

    if not success:
        raise RuntimeError(
            "Failed to save EDSR output."
        )

    print()
    print("=" * 60)
    print("SUCCESS")
    print("=" * 60)

    print(
        f"Original : {width} x {height}"
    )

    print(
        f"Enhanced : {result_width} x {result_height}"
    )

    print(
        f"Output   : {OUTPUT_IMAGE}"
    )

    print()
    print("EDSR x4 processing complete.")


if __name__ == "__main__":
    main()