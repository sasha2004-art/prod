import os

# Имя выходного файла
OUTPUT_FILE = 'project_code_dump.txt'

# Папки и файлы, которые мы ИГНОРИРУЕМ (не читаем их содержимое)
# Шрифты и картинки нельзя читать как текст, это сломает кодировку
IGNORE_EXTENSIONS = {
    # Шрифты
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    # Картинки
    '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico',
    # Архивы и бинарники
    '.zip', '.rar', '.exe', '.pyc',
    # Данные (обычно CSV слишком большие и не являются кодом, но можно убрать из списка)
    '.csv' 
}

# Папки, которые можно вообще не открывать (опционально)
IGNORE_DIRS = {'.git', '__pycache__', '.idea', '.vscode'}

def generate_tree(startpath):
    """Генерирует структуру дерева папок в виде строки"""
    tree_str = f"{os.path.basename(os.path.abspath(startpath))}/\n"
    
    for root, dirs, files in os.walk(startpath):
        # Фильтрация игнорируемых папок
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        level = root.replace(startpath, '').count(os.sep)
        indent = '│   ' * (level)
        subindent = '├── '
        
        if root != startpath:
            tree_str += f"{indent[:-4]}├── {os.path.basename(root)}/\n"
            
        for i, f in enumerate(files):
            # Визуальное оформление последнего элемента
            connector = '└── ' if i == len(files) - 1 and not dirs else '├── '
            # Если мы внутри папки, отступ меняется
            if root != startpath:
                 tree_str += f"{indent}{connector}{f}\n"
            else:
                 tree_str += f"{connector}{f}\n"
                 
    return tree_str

def is_text_file(filename):
    """Проверяет, является ли файл текстовым (по расширению)"""
    _, ext = os.path.splitext(filename)
    return ext.lower() not in IGNORE_EXTENSIONS

def main():
    current_dir = os.getcwd()
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # 1. Записываем дерево проекта
        outfile.write("="*50 + "\n")
        outfile.write("PROJECT TREE STRUCTURE\n")
        outfile.write("="*50 + "\n\n")
        outfile.write(generate_tree(current_dir))
        outfile.write("\n\n" + "="*50 + "\n")
        outfile.write("FILE CONTENTS\n")
        outfile.write("="*50 + "\n\n")

        # 2. Проходим по файлам и записываем содержимое
        for root, dirs, files in os.walk(current_dir):
            # Убираем ненужные папки
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

            for file in files:
                file_path = os.path.join(root, file)
                
                # Не читаем сам файл дампа, чтобы не зациклиться
                if file == OUTPUT_FILE or file == os.path.basename(__file__):
                    continue

                if is_text_file(file):
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        # Красивый разделитель
                        relative_path = os.path.relpath(file_path, current_dir)
                        outfile.write(f"\n{'='*20} START OF FILE: {relative_path} {'='*20}\n")
                        outfile.write(content)
                        outfile.write(f"\n{'='*20} END OF FILE: {relative_path} {'='*20}\n\n")
                        
                        print(f"[+] Записан: {relative_path}")
                        
                    except UnicodeDecodeError:
                        print(f"[-] Ошибка кодировки (пропущен): {file}")
                    except Exception as e:
                        print(f"[-] Ошибка чтения {file}: {e}")
                else:
                    print(f"[.] Пропущен (бинарный/игнорируемый): {file}")

    print(f"\nГотово! Всё сохранено в файл: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()