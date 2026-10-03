# Struct exercises (class on Saturday 3/10/69)

The questions are in `C Programming Struct Exercises.pdf`.

| File | Topic |
|---|---|
| `exercise1.c` | Assigning to struct members, and why `s1.name = "Bob";` doesn't compile |
| `exercise2.c` | Array of structs (`struct book library[]`), counting elements with `sizeof` |
| `exercise3.c` | Size of structs and arrays, including padding |

## How to run

Open a terminal in this folder:

```bash
cd struct/exercise
```

Compile and run each file:

```bash
gcc -Wall exercise1.c -o exercise1 && ./exercise1
gcc -Wall exercise2.c -o exercise2 && ./exercise2
gcc -Wall exercise3.c -o exercise3 && ./exercise3
```

- `gcc -Wall exercise1.c` compiles the code and shows warnings.
- `-o exercise1` names the program `exercise1`.
- `&& ./exercise1` runs it, but only if compiling succeeded.

The compiled programs are ignored by git (see the root `.gitignore`).

## Expected output

**exercise1**
```
Before: id=101 name=Alice gpa=3.75
After:  id=102 name=Bob gpa=4.00
```
Choice 4 (`s1.name = "Bob";`) is invalid in C because you cannot assign to an array.
It is commented out and replaced with `strcpy(s1.name, "Bob");`.

**exercise2**
```
sizeof(struct book) = 24 bytes
sizeof(library)     = 48 bytes
Number of books     = 2
library[0]: title=Math pages=150
library[1]: title=Physics pages=200
```

**exercise3**
```
sizeof(x1)  = 20 bytes
sizeof(x2)  = 24 bytes
sizeof(arr) = 60 bytes
sizeof(x3)  = 20 bytes
```
In the original question every struct is named `item` and every variable `x`, which is a
redefinition error. They are renamed `item1`/`x1`, `item2`/`x2`, `item3`/`x3` so the file compiles.

Why the sizes are larger than the sum of the members (padding, on a typical 64-bit machine):

| Variable | Members | Padding | Total |
|---|---|---|---|
| `struct book` | 20 (title) + 4 (int) | 0 | 24 |
| `x1` | 10 (code) + 4 (int) + 4 (float) | 2 after `code` | 20 |
| `x2` | 12 (name) + 8 (double) | 4 after `name` | 24 |
| `arr[3][5]` | 15 × 4 (int) | none | 60 |
| `x3` | 15 (title) + 4 (int) | 1 after `title` | 20 |
