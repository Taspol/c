# comprog

My computer programming (C) study notes and practice code.

## Folder layout

```
struct/
├── exercise/          Code we studied in class on Saturday 3/10/69 (3 Oct 2026)
│   ├── exercise1.c    Struct members: assigning values, why `s1.name = "Bob"` fails
│   ├── exercise2.c    Array of structs (`struct book library[]`) and sizeof
│   ├── exercise3.c    Struct sizes and padding
│   └── C Programming Struct Exercises.pdf
└── add_on_problem/    Extra struct practice (Thai), with tests and solutions
```

## Running the class exercises

```bash
cd struct/exercise
gcc -Wall exercise1.c -o exercise1 && ./exercise1
gcc -Wall exercise2.c -o exercise2 && ./exercise2
gcc -Wall exercise3.c -o exercise3 && ./exercise3
```

The compiled programs (`exercise1`, `exercise2`, ...) are ignored by git.

## Running the add-on practice

Fill in the TODOs in `struct/add_on_problem/practice.c`, then:

```bash
cd struct/add_on_problem
python3 test.py              # check your practice.c
python3 test.py --solution   # check the provided solution
```

See `struct/add_on_problem/README.md` for the full lesson.
