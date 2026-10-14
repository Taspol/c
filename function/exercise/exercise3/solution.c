// Exercise 3 (solution)
// Same program as problem.c, with a trace of every step in the comments.
//
// Result:
//  i=18, j=0
//  i=18, j=4
//  W.i=42,W.j=52
//  X.i=10, X.j=20
//  Y.i=20, Y.j=31
//  Z.i=?, Z.j=?      <- garbage: Z was never given a value
//
// Key ideas:
//   - There are TWO variables named i: the global i (starts at 0) and main's local i.
//     Inside main, "i" means the local one. Inside fa/fb, "i" means the global one.
//   - Passing a pointer (&i, &j, &Y) lets the function change main's variable.
//   - Passing a value (j, i, X, Z) gives the function a copy; main's variable doesn't change.

#include <stdio.h>
int i; // global i = 0
struct data {
    int i;
    int j;
} W; // global W = {0, 0}
void fa(int *a, int b);
void fb(int c, int *d);
void fc(struct data x, struct data *y, struct data z);

int main(void) {
    int j = 0;
    int i = 15; // local i, hides the global i inside main
    struct data X, Y, Z;
    X.i = 10;
    X.j = 20;
    fa(&i, j);                          // main i: 15 -> 18, global i: 0 -> 4, j stays 0
    printf("\n i=%d, j=%d", i, j);      // i=18, j=0
    fb(i, &j);                          // j: 0 -> 4 (adds global i = 4), main i unchanged
    printf("\n i=%d, j=%d", i, j);      // i=18, j=4
    fc(X, &Y, Z);                       // fills Y and W; X and Z are copies, unchanged
    printf("\n W.i=%d,W.j=%d", W.i, W.j); // W.i=42, W.j=52
    printf("\n X.i=%d, X.j=%d", X.i, X.j); // X.i=10, X.j=20 (fc changed only a copy)
    printf("\n Y.i=%d, Y.j=%d", Y.i, Y.j); // Y.i=20, Y.j=31
    printf("\n Z.i=%d, Z.j=%d", Z.i, Z.j); // garbage: Z was never initialized
    return 0;
}

void fa(int *a, int b) { // a points to main's i (15), b is a copy of j (0)
    i = 4;               // GLOBAL i = 4 (fa can't see main's local i)
    *a = *a + 3;         // main's i = 15 + 3 = 18
    b = i + 2;           // b = 6, but b is only a copy, so main's j stays 0
}

void fb(int c, int *d) { // c is a copy of main's i (18), d points to main's j (0)
    c += i;              // c = 18 + 4 = 22, only the copy changes
    *d += i;             // main's j = 0 + 4 = 4
}

void fc(struct data x, struct data *y, struct data z) { // x = copy of X {10, 20}
    y->i = x.j++;              // Y.i = 20, then x.j = 21    (post-increment: use, then add)
    y->j = y->i + (++x.i);     // x.i = 11 first, Y.j = 20 + 11 = 31 (pre-increment)
    z.i = x.j;                 // z.i = 21 (z is a copy, main's Z is NOT changed)
    z.j = y->j;                // z.j = 31
    W.i = y->i + (++x.j);      // x.j = 22 first, W.i = 20 + 22 = 42
    W.j = y->j + z.i;          // W.j = 31 + 21 = 52
}
