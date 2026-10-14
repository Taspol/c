#include <stdio.h>

// Problem 11: nested loop with struct array data
// Answer: 2) 3 6

struct bar { int beat[3]; } bars[2] = {{{1, 2, 3}}, {{2, 3, 4}}};

int main(void) {
    int count = 0, sum = 0;

    // code from the problem, with a trace line added inside the loop
    for (int i = 0; i < 2; i++)
        for (int j = 0; j <= i; j++) {
            count++;sum += bars[i].beat[j];
            printf("i=%d j=%d -> bars[%d].beat[%d] = %d (count=%d, sum=%d)\n",
                   i, j, i, j, bars[i].beat[j], count, sum);
        }

    printf("%d %d\n", count, sum);
    return 0;
}
