#include <stdio.h>

// Problem 8: increasing a struct member one statement at a time
// Answer: 4) 10 13 14 16 14

struct point { int x; } p = {10};

int main(void) {
    // code from the problem
    printf("%d ", p.x++);    // prints 10, then x becomes 11 (post-increment)
    printf("%d ", p.x += 2); // x = 11 + 2 = 13, prints 13
    printf("%d ", ++p.x);    // x becomes 14 first, then prints 14 (pre-increment)
    printf("%d ", p.x + 2);  // prints 16, but x is NOT changed (still 14)
    printf("%d ", p.x);      // prints 14
    printf("\n");
    return 0;
}
