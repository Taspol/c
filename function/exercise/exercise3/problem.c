// Exercise 3
// What is the result of this program?

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
