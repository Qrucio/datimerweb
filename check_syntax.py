
import sys

def check_balance(file_path):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for i, line in enumerate(lines):
        for j, char in enumerate(line):
            if char in '({[':
                stack.append((char, i + 1, j + 1))
            elif char in ')}]':
                if not stack:
                    print(f"Error: Unexpected closing '{char}' at line {i + 1}, col {j + 1}")
                    return
                last_open, last_line, last_col = stack.pop()
                expected_open = mapping[char]
                if last_open != expected_open:
                    print(f"Error: Mismatched closing '{char}' at line {i + 1}, col {j + 1}. Expected closing for '{last_open}' from line {last_line}, col {last_col}")
                    return

    if stack:
        last_open, last_line, last_col = stack[-1]
        print(f"Error: Unclosed '{last_open}' at line {last_line}, col {last_col}")
    else:
        print("No syntax errors found (balanced braces).")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_syntax.py <file_path>")
    else:
        check_balance(sys.argv[1])
