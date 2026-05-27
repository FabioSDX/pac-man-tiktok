import os
import requests
import cloudinary
import cloudinary.uploader

# ==========================================
# INSIRA SUAS CREDENCIAIS DO CLOUDINARY AQUI
# ==========================================
cloudinary.config( 
  cloud_name = "SEU_CLOUD_NAME", 
  api_key = "SUA_API_KEY", 
  api_secret = "SEU_API_SECRET",
  secure = True
)

input_dir = r"c:\laragon8\www\fallingpickaxeticktockmoney\block"
output_dir = r"c:\laragon8\www\fallingpickaxeticktockmoney\block_hd"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def process_images():
    print("Iniciando processamento em massa com Cloudinary...")
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(".png"):
            file_path = os.path.join(input_dir, filename)
            output_path = os.path.join(output_dir, filename)
            
            # Pula se já existir
            if os.path.exists(output_path):
                print(f"✅ {filename} já processado. Pulando...")
                continue
                
            print(f"⬆️ Fazendo upload de {filename}...")
            
            try:
                # Faz o upload e aplica a melhoria de IA (upscale + melhora de cor/contraste)
                response = cloudinary.uploader.upload(
                    file_path, 
                    public_id=f"pickaxe_blocks/{filename.split('.')[0]}",
                    transformation=[
                        {"effect": "upscale"},   # Aumenta a resolução usando IA
                        {"effect": "improve"},   # Melhora cores e contraste
                        {"quality": "auto"}      # Otimiza a qualidade
                    ]
                )
                
                # Pega a URL da imagem tratada
                image_url = response['secure_url']
                
                print(f"⬇️ Baixando versão HD de {filename}...")
                img_data = requests.get(image_url).content
                with open(output_path, 'wb') as handler:
                    handler.write(img_data)
                    
            except Exception as e:
                print(f"❌ Erro ao processar {filename}: {e}")

    print("🎉 Processamento concluído! As imagens melhoradas estão na pasta 'block_hd'.")

if __name__ == "__main__":
    process_images()
