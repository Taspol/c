# Exercise 3: what is the result?

## Problem

**What is the result of this program?** Trace it by hand before running.

```c
#include <stdio.h>
int i;
struct data {
    int i;
    int j;
} W;
void fa(int *a, int b);
void fb(int c, int *d);
void fc(struct data x, struct data *y, struct data z);

int main(void) {
    int j = 0;
    int i = 15;
    struct data X, Y, Z;
    X.i = 10;
    X.j = 20;
    fa(&i, j);
    printf("\n i=%d, j=%d", i, j);
    fb(i, &j);
    printf("\n i=%d, j=%d", i, j);
    fc(X, &Y, Z);
    printf("\n W.i=%d,W.j=%d", W.i, W.j);
    printf("\n X.i=%d, X.j=%d", X.i, X.j);
    printf("\n Y.i=%d, Y.j=%d", Y.i, Y.j);
    printf("\n Z.i=%d, Z.j=%d", Z.i, Z.j);
    return 0;
}

void fa(int *a, int b) {
    i = 4;
    *a = *a + 3;
    b = i + 2;
}

void fb(int c, int *d) {
    c += i;
    *d += i;
}

void fc(struct data x, struct data *y, struct data z) {
    y->i = x.j++;
    y->j = y->i + (++x.i);
    z.i = x.j;
    z.j = y->j;
    W.i = y->i + (++x.j);
    W.j = y->j + z.i;
}
```

Things to watch:

- There are two variables named `i`: a global one and a local one in `main`. Which one does `fa()` change?
- Which arguments are passed as a pointer (`&`) and which as a copy?
- `x.j++` and `++x.i`: does the value change before or after it is used?
- What value does `Z` have?

## How to run

```bash
cd function/exercise/exercise3
gcc -Wall problem.c -o problem && ./problem
```

`gcc` shows one warning: `variable 'Z' is uninitialized`. That warning is a hint to the
last question, not a mistake in the exercise.

## Answer

```
 i=18, j=0
 i=18, j=4
 W.i=42,W.j=52
 X.i=10, X.j=20
 Y.i=20, Y.j=31
 Z.i=?, Z.j=?
```

The `Z` line prints garbage (for example `Z.i=1, Z.j=-16`) because `Z` is never given a value,
and `fc()` only changes its own copy `z`. The numbers can differ between computers.

See `solution.c` for a step-by-step trace in the comments.
