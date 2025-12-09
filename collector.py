import os

# Имя выходного файла
OUTPUT_FILE = 'project_code_dump.txt'

# Список файлов, которые НУЖНО включить (только они попадут в отчет)
TARGET_FILES = {
    'index.html', 
    'style-spirit.css'
}

# Папки, которые можно вообще не открывать (для ускорения)
IGNORE_DIRS = {'.git', '__pycache__', '.idea', '.vscode', 'node_modules'}

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
            # Визуальное оформление
            connector = '└── ' if i == len(files) - 1 and not dirs else '├── '
            if root != startpath:
                 tree_str += f"{indent}{connector}{f}\n"
            else:
                 tree_str += f"{connector}{f}\n"
                 
    return tree_str

def main():
    current_dir = os.getcwd()
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # 1. Записываем дерево проекта (для контекста, где лежат файлы)
        outfile.write("="*50 + "\n")
        outfile.write("PROJECT TREE STRUCTURE\n")
        outfile.write("="*50 + "\n\n")
        outfile.write(generate_tree(current_dir))
        outfile.write("\n\n" + "="*50 + "\n")
        outfile.write("FILE CONTENTS\n")
        outfile.write("="*50 + "\n\n")

        # 2. Проходим по файлам и записываем содержимое ТОЛЬКО целевых файлов
        found_files_count = 0
        
        for root, dirs, files in os.walk(current_dir):
            # Убираем ненужные папки из обхода
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

            for file in files:
                # ПРОВЕРКА: Если имя файла в нашем списке целевых файлов
                if file in TARGET_FILES:
                    file_path = os.path.join(root, file)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        # Красивый разделитель
                        relative_path = os.path.relpath(file_path, current_dir)
                        outfile.write(f"\n{'='*20} START OF FILE: {relative_path} {'='*20}\n")
                        outfile.write(content)
                        outfile.write(f"\n{'='*20} END OF FILE: {relative_path} {'='*20}\n\n")
                        
                        print(f"[+] Записан: {relative_path}")
                        found_files_count += 1
                        
                    except UnicodeDecodeError:
                        print(f"[-] Ошибка кодировки: {file}")
                    except Exception as e:
                        print(f"[-] Ошибка чтения {file}: {e}")
                else:
                    # Можно раскомментировать, если нужно видеть, что пропускается
                    # print(f"[.] Пропущен: {file}")
                    pass

    print(f"\nГотово! Обработано файлов: {found_files_count}.")
    print(f"Всё сохранено в файл: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()