import os
from rembg import remove
from PIL import Image

input_files = {
    'mc_cloud_1': r"C:\Users\fabai\.gemini\antigravity\brain\db22ee10-3788-4843-a7bd-cc08af39468d\mc_cloud_1_1779836192276.png",
    'mc_cloud_2': r"C:\Users\fabai\.gemini\antigravity\brain\db22ee10-3788-4843-a7bd-cc08af39468d\mc_cloud_2_1779836207489.png",
    'mc_bird_1': r"C:\Users\fabai\.gemini\antigravity\brain\db22ee10-3788-4843-a7bd-cc08af39468d\mc_bird_1_1779836221101.png",
    'mc_bird_2': r"C:\Users\fabai\.gemini\antigravity\brain\db22ee10-3788-4843-a7bd-cc08af39468d\mc_bird_2_1779836235088.png",
    'mc_balloon': r"C:\Users\fabai\.gemini\antigravity\brain\db22ee10-3788-4843-a7bd-cc08af39468d\mc_balloon_1779836249237.png",
    'mc_rainbow': r"C:\Users\fabai\.gemini\antigravity\brain\db22ee10-3788-4843-a7bd-cc08af39468d\mc_rainbow_1779836268167.png",
    'mc_planet': r"C:\Users\fabai\.gemini\antigravity\brain\db22ee10-3788-4843-a7bd-cc08af39468d\mc_planet_1779836280599.png",
    'mc_moon': r"C:\Users\fabai\.gemini\antigravity\brain\db22ee10-3788-4843-a7bd-cc08af39468d\mc_moon_1779836293482.png"
}

output_dir = r"c:\laragon8\www\fallingpickaxeticktockmoney\bg_assets"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def process():
    print("Iniciando remoção de fundos com AI (rembg)...")
    for name, path in input_files.items():
        if os.path.exists(path):
            print(f"Removendo fundo de {name}...")
            try:
                img = Image.open(path)
                out = remove(img)
                out.save(os.path.join(output_dir, f"{name}.png"))
                print(f"Salvo: {name}.png")
            except Exception as e:
                print(f"Erro em {name}: {e}")
        else:
            print(f"Arquivo não encontrado: {path}")

if __name__ == "__main__":
    process()
