import os
from PIL import Image

input_dir = r"c:\laragon8\www\fallingpickaxeticktockmoney\block"
output_dir = r"c:\laragon8\www\fallingpickaxeticktockmoney\block_glows"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def process_masks():
    print("Iniciando criação de máscaras de brilho...")
    
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(".png"):
            file_path = os.path.join(input_dir, filename)
            glow_filename = filename.split('.')[0] + "_glow.png"
            output_path = os.path.join(output_dir, glow_filename)
            
            try:
                img = Image.open(file_path).convert('RGBA')
                width, height = img.size
                
                # Criar nova imagem vazia (transparente) para o brilho
                glow_img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
                
                pixels = img.load()
                glow_pixels = glow_img.load()
                
                has_glow = False
                
                for y in range(height):
                    for x in range(width):
                        r, g, b, a = pixels[x, y]
                        if a > 0:
                            # Calcular saturação e brilho
                            mx = max(r, g, b)
                            mn = min(r, g, b)
                            vibrancy = mx - mn # Saturação absoluta (chroma)
                            
                            # Filtro para encontrar os pixels mais coloridos e brilhantes
                            # Excluímos tons muito escuros e muito acinzentados
                            is_vibrant = vibrancy > 60 and mx > 100
                            
                            # Exceção para o ouro/esmeralda/diamante que queremos que brilhem forte
                            if is_vibrant:
                                # Aumentamos o brilho do pixel na máscara para o efeito "Lighter"
                                nr = min(255, int(r * 1.5))
                                ng = min(255, int(g * 1.5))
                                nb = min(255, int(b * 1.5))
                                glow_pixels[x, y] = (nr, ng, nb, a)
                                has_glow = True
                                
                if has_glow:
                    glow_img.save(output_path)
                    print(f"Criada máscara: {glow_filename}")
                    
            except Exception as e:
                print(f"Erro ao processar {filename}: {e}")

    print("Máscaras de brilho criadas com sucesso na pasta 'block_glows'!")

if __name__ == "__main__":
    process_masks()
