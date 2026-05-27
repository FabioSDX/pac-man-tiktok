import os
from rembg import remove
from PIL import Image

input_files = {
    'mc_cloud_1': r"C:\Users\fabai\.gemini\antigravity\brain\db22ee10-3788-4843-a7bd-cc08af39468d\mc_cloud_new_1_1779836987399.png",
    'mc_cloud_2': r"C:\Users\fabai\.gemini\antigravity\brain\db22ee10-3788-4843-a7bd-cc08af39468d\mc_cloud_new_2_1779837002821.png"
}

output_dir = r"c:\laragon8\www\fallingpickaxeticktockmoney\bg_assets"

def process():
    for name, path in input_files.items():
        if os.path.exists(path):
            img = Image.open(path)
            out = remove(img)
            out.save(os.path.join(output_dir, f"{name}.png"))
            print(f"Salvo: {name}.png")

if __name__ == "__main__":
    process()
