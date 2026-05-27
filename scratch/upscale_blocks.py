import os
from PIL import Image, ImageEnhance

input_dir = r"c:\laragon8\www\fallingpickaxeticktockmoney\block"
output_dir = r"c:\laragon8\www\fallingpickaxeticktockmoney\block_hq"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def process_images():
    print("Iniciando tratamento de imagem local com Python (Pillow)...")
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(".png"):
            file_path = os.path.join(input_dir, filename)
            output_path = os.path.join(output_dir, filename)
            
            print(f"Processando {filename}...")
            try:
                img = Image.open(file_path).convert('RGBA')
                
                # 1. Aumentar resolução 4x usando Nearest Neighbor (mantém as bordas dos pixels perfeitas)
                new_size = (img.width * 4, img.height * 4)
                img = img.resize(new_size, Image.NEAREST)
                
                # 2. Aumentar Saturação (cores mais vibrantes)
                enhancer_color = ImageEnhance.Color(img)
                img = enhancer_color.enhance(1.4) # 40% mais cor
                
                # 3. Aumentar Contraste (sombras mais fortes)
                enhancer_contrast = ImageEnhance.Contrast(img)
                img = enhancer_contrast.enhance(1.2) # 20% mais contraste
                
                # Salva o arquivo final
                img.save(output_path)
                    
            except Exception as e:
                print(f"Erro ao processar {filename}: {e}")

    print("Processamento concluído! As imagens vibrantes e em HD estão na pasta 'block_hq'.")

if __name__ == "__main__":
    process_images()
