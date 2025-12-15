import os

# Имя выходного файла
OUTPUT_FILE = 'project_code_dump.txt'

# Список файлов, которые НУЖНО включить (указывайте пути относительно корня запуска скрипта)
TARGET_FILES = {
    'index.html', 
    'style-spirit.css',
    'js/game_birds.js',
    'js/game_casino.js',
    'js/game_zombies.js'
}

# Папки, которые можно вообще не открывать (для ускорения)
IGNORE_DIRS = {'.git', '__pycache__', '.idea', '.vscode', 'node_modules'}

def generate_tree(startpath):
    """Генерирует структуру дерева папок в виде строки"""
    tree_str = f"{os.path.basename(os.path.abspath(startpath))}/\n"
    
    for root, dirs, files in os.walk(startpath):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        level = root.replace(startpath, '').count(os.sep)
        indent = '│   ' * (level)
        
        if root != startpath:
            tree_str += f"{indent[:-4]}├── {os.path.basename(root)}/\n"
            
        for i, f in enumerate(files):
            connector = '└── ' if i == len(files) - 1 and not dirs else '├── '
            if root != startpath:
                 tree_str += f"{indent}{connector}{f}\n"
            else:
                 tree_str += f"{connector}{f}\n"
                 
    return tree_str

def main():
    current_dir = os.getcwd()
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # 1. Дерево
        outfile.write("="*50 + "\n")
        outfile.write("PROJECT TREE STRUCTURE\n")
        outfile.write("="*50 + "\n\n")
        outfile.write(generate_tree(current_dir))
        outfile.write("\n\n" + "="*50 + "\n")
        outfile.write("FILE CONTENTS\n")
        outfile.write("="*50 + "\n\n")

        found_files_count = 0
        
        # 2. Обход файлов
        for root, dirs, files in os.walk(current_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

            for file in files:
                # Получаем полный путь к файлу
                full_path = os.path.join(root, file)
                
                # Получаем путь относительно папки запуска (например: "js/game_birds.js")
                rel_path = os.path.relpath(full_path, current_dir)
                
                # ВАЖНО: Нормализуем слеши. Windows использует '\', а в списке TARGET_FILES указаны '/'.
                # Приводим всё к прямым слешам для сравнения.
                rel_path_normalized = rel_path.replace('\\', '/')

                # ПРОВЕРКА: Сравниваем нормализованный относительный путь
                if rel_path_normalized in TARGET_FILES:
                    
                    try:
                        with open(full_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        outfile.write(f"\n{'='*20} START OF FILE: {rel_path_normalized} {'='*20}\n")
                        outfile.write(content)
                        outfile.write(f"\n{'='*20} END OF FILE: {rel_path_normalized} {'='*20}\n\n")
                        
                        print(f"[+] Записан: {rel_path_normalized}")
                        found_files_count += 1
                        
                    except UnicodeDecodeError:
                        print(f"[-] Ошибка кодировки: {rel_path_normalized}")
                    except Exception as e:
                        print(f"[-] Ошибка чтения {rel_path_normalized}: {e}")

    print(f"\nГотово! Обработано файлов: {found_files_count}.")
    print(f"Всё сохранено в файл: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()