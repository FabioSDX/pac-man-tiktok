import os
from PIL import Image

def remove_outline(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    print(f"Processando {filepath}...")
    img = Image.open(filepath).convert("RGBA")
    datas = img.getdata()
    
    new_data = []
    for item in datas:
        r, g, b, a = item
        # If the pixel is dark (part of the outline)
        # Assuming the cloud is mostly white/light-grey, the outline is dark.
        # Let's say if the pixel is darker than a threshold, remove it.
        if a > 0 and r < 120 and g < 120 and b < 120:
            new_data.append((255, 255, 255, 0)) # Make transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(filepath)
    print(f"Contorno removido de {filepath}")

# Process the two minecraft clouds
clouds = [
    r"c:\laragon8\www\fallingpickaxeticktockmoney\bg_assets\mc_cloud_1.png",
    r"c:\laragon8\www\fallingpickaxeticktockmoney\bg_assets\mc_cloud_2.png"
]

for c in clouds:
    remove_outline(c)
