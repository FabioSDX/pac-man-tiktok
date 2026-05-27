import os
from PIL import Image, ImageEnhance

# The two egg files
files_to_process = [
    r"c:\laragon8\www\fallingpickaxeticktockmoney\pig\Pig eg.png",
    r"c:\laragon8\www\fallingpickaxeticktockmoney\animais bonus\ovelha\ovo ovelha.png"
]

def process_images():
    print("Iniciando upscale nos ovos...")
    for file_path in files_to_process:
        if os.path.exists(file_path):
            filename = os.path.basename(file_path)
            print(f"Processando {filename}...")
            try:
                img = Image.open(file_path).convert('RGBA')
                
                # Upscale 4x Nearest Neighbor
                new_size = (img.width * 4, img.height * 4)
                img = img.resize(new_size, Image.NEAREST)
                
                # Enhance Color
                enhancer_color = ImageEnhance.Color(img)
                img = enhancer_color.enhance(1.4)
                
                # Enhance Contrast
                enhancer_contrast = ImageEnhance.Contrast(img)
                img = enhancer_contrast.enhance(1.2)
                
                # Save replacing the original
                img.save(file_path)
                print(f"Sucesso: {filename} atualizado para HD!")
                    
            except Exception as e:
                print(f"Erro ao processar {filename}: {e}")
        else:
            print(f"Arquivo não encontrado: {file_path}")

    print("Concluído!")

if __name__ == "__main__":
    process_images()
