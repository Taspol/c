# Exercise 1: game character

## Problem

This is a program that keeps the data of one game character. The program consists of these functions:

- `getdata()` creates the character's data (already given)
- `heal20()` uses one potion to increase HP by 20, only if a potion is left (already given)
- `damage15()` decreases HP by 15
- `showdata()` shows the details of the character

**Please complete the program in `problem.c`**: fill in every `........`, then remove the
`/* */` and `//` around them so the functions are called.

Hints:

- What should `showdata()` return? Does it need to change the character, or only read it?
- `damage15()` must change `y` inside `main`, and `main` calls it as `damage15(&y)`.
  Compare its parameter with `heal20()`.
- Inside the function, `x->hp` means "the `hp` of the struct that `x` points to".
- `showdata()` should print in this format: `Name: Knight  HP: 50  Potion: 3`

## How to run

```bash
cd function/exercise/exercise1
gcc -Wall problem.c -o problem && ./problem      # your answer
gcc -Wall solution.c -o solution && ./solution   # the solution
```

## Expected output

```
Name: Knight  HP: 50  Potion: 3
Name: Knight  HP: 20  Potion: 3
Name: Knight  HP: 40  Potion: 2
```

If you get `error: passing 'struct character *' to parameter of incompatible type`,
`damage15()` takes a copy (`struct character x`) but `main` passes an address (`&y`).
Check its parameter.

## Note: C vs the class slide

The class slide uses `struct product &x`. That `&` is a C++ reference and doesn't compile in C.
This exercise uses the C way instead: a pointer.

| C++ (slide) | C (this exercise) |
|---|---|
| `void heal20(struct character &x)` | `void heal20(struct character *x)` |
| `x.hp += 20;` | `x->hp += 20;` |
| `heal20(y);` | `heal20(&y);` |
