import os
import sys
import subprocess
from PIL import Image, ImageDraw

# 需要生成的图标尺寸
ICON_SIZES = [
    (16, "icon_16x16"),
    (32, "icon_16x16@2x"),
    (32, "icon_32x32"),
    (64, "icon_32x32@2x"),
    (128, "icon_128x128"),
    (256, "icon_128x128@2x"),
    (256, "icon_256x256"),
    (512, "icon_256x256@2x"),
    (512, "icon_512x512"),
    (1024, "icon_512x512@2x"),
]

def add_rounded_corners(im, radius):
    """给图像添加圆角"""
    mask = Image.new("L", im.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0) + im.size, radius, fill=255)
    im.putalpha(mask)
    return im

def check_environment():
    """检查当前系统是否是 macOS，并且 iconutil 可用"""
    if sys.platform != "darwin":
        print("❌ 本脚本仅适用于 macOS！")
        sys.exit(1)

    if subprocess.run(["which", "iconutil"], stdout=subprocess.PIPE).returncode != 0:
        print("❌ 未找到 iconutil，请确保你在 macOS 上运行本脚本！")
        sys.exit(1)

def create_iconset(source_image):
    """生成 icon.iconset 并转换成 icns"""
    if not os.path.exists(source_image):
        print(f"❌ 找不到源文件 {source_image}")
        sys.exit(1)

    iconset_dir = "icon.iconset"
    os.makedirs(iconset_dir, exist_ok=True)

    # 读取原始图片
    original_img = Image.open(source_image).convert("RGBA")

    for size, name in ICON_SIZES:
        output_path = os.path.join(iconset_dir, f"{name}.png")
        resized_img = original_img.resize((size, size), Image.LANCZOS)

        # 计算圆角半径（通常是尺寸的 20%）
        radius = size // 5  
        rounded_img = add_rounded_corners(resized_img, radius)
        
        rounded_img.save(output_path, "PNG")
        print(f"✅ 生成 {output_path}")

    # 调用 iconutil 生成 .icns 文件
    icns_file = "icon.icns"
    try:
        subprocess.run(["iconutil", "-c", "icns", iconset_dir, "-o", icns_file], check=True)
        print(f"🎉 成功生成 {icns_file}")
    except subprocess.CalledProcessError:
        print(f"❌ 生成 {icns_file} 失败")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ 请提供一个 1024x1024 的 PNG 文件，例如：")
        print(f"   python {os.path.basename(__file__)} icon.png")
        sys.exit(1)

    check_environment()
    create_iconset(sys.argv[1])