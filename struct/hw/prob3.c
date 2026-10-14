#include <stdio.h>

// Problem 3: storing 10 / 3 in a float field
// Answer: 3) 3.00

struct practice { float average; } p;

int main(void) {
    // code from the problem
    p.average = 10 / 3; // 3.00
    printf("%.2f\n", p.average);

    // 10 and 3 are both int, so 10 / 3 is integer division = 3
    printf("10 / 3   = %.2f (int division)\n", p.average);

    // to get 3.33, at least one side must be a floating-point number
    p.average = 10 / 3.0f; // int / float = float
    printf("10 / 3.0 = %.2f (float division)\n", p.average);
    return 0;
}
