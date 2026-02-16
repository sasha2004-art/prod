import os
import re
import requests
from io import BytesIO
from PIL import Image

# --- СНИМАЕМ ЛИМИТ НА РАЗМЕР КАРТИНОК (ДЛЯ ВАН ГОГА) ---
Image.MAX_IMAGE_PIXELS = None 

# --- НАСТРОЙКИ ---
HTML_FILE = 'chemistry.html'
IMG_FOLDER = 'img'
MAX_WIDTH = 1920
MAX_HEIGHT = 1080

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def process_image(img_data, save_path):
    try:
        img = Image.open(BytesIO(img_data))
        
        # Если картинка большая — уменьшаем
        if img.width > MAX_WIDTH or img.height > MAX_HEIGHT:
            print(f"   ✂️ Сжимаю с {img.width}x{img.height} до {MAX_WIDTH}x{MAX_HEIGHT}...")
            img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.Resampling.LANCZOS)

        if img.mode in ("RGBA", "P") and save_path.lower().endswith('.jpg'):
             img = img.convert("RGB")

        # Сохраняем с качеством 85
        img.save(save_path, optimize=True, quality=85)
        return True
    except Exception as e:
        print(f"   ⚠️ Ошибка Pillow: {e}")
        # Если не вышло сжать, сохраняем как есть (крайний случай)
        with open(save_path, 'wb') as f:
            f.write(img_data)
        return True

def main():
    # Создаем папку
    if not os.path.exists(IMG_FOLDER):
        os.makedirs(IMG_FOLDER)

    if not os.path.exists(HTML_FILE):
        print(f"❌ Файл {HTML_FILE} не найден!")
        return

    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Регулярка для поиска ссылок
    pattern = r'(?:src=["\']|url\([\'"]?)(http[s]?://[^"\'\)]+)(?:["\']|\))'
    urls = list(set(re.findall(pattern, content)))
    
    print(f"🔍 Найдено ссылок: {len(urls)}")
    
    replacements = {}
    
    # Считаем успешно скачанные файлы
    downloaded_count = 0

    for url in urls:
        try:
            filename = url.split('/')[-1].split('?')[0]
            filename = re.sub(r'[^\w\-.]', '_', filename)
            
            if len(filename) > 50: filename = filename[-50:]
            if not re.search(r'\.\w{3,4}$', filename): filename += '.jpg'

            local_path = os.path.join(IMG_FOLDER, filename)
            
            # --- ПЕРЕКАЧИВАЕМ, ДАЖЕ ЕСЛИ ЕСТЬ (ЧТОБЫ ИСПРАВИТЬ ГИГАНТСКИЙ ФАЙЛ) ---
            print(f"⬇️ Скачиваю: {url}")
            response = requests.get(url, headers=HEADERS, timeout=30) # Увеличил таймаут до 30 сек
            
            if response.status_code == 200:
                success = process_image(response.content, local_path)
                if success:
                    # Путь для HTML (img/файл.jpg)
                    replacements[url] = f"{IMG_FOLDER}/{filename}"
                    downloaded_count += 1
                    print(f"✅ Готово: {filename}")
            else:
                print(f"⚠️ Ошибка сервера: {response.status_code}")

        except Exception as e:
            print(f"❌ Ошибка: {e}")

    # Замена ссылок в HTML
    if replacements:
        for old_url, new_path in replacements.items():
            content = content.replace(old_url, new_path)
        
        with open(HTML_FILE, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n🎉 HTML обновлен! Сжато картинок: {downloaded_count}")
    else:
        print("\nКартинки не обновлены.")

if __name__ == "__main__":
    main()