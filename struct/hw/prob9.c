#include <stdio.h>

// Problem 9: reading a name that contains spaces with %s
// Input: Violin Basics 200
// Answer: 3) Basics

struct book { char name[20]; char level[20]; } b;

int main(void) {
    // code from the problem
    scanf("%19s %19s", b.name, b.level);

    // why: %s stops reading at a space, so each %s takes only one word
    //   1st %s -> "Violin" goes to b.name
    //   2nd %s -> "Basics" goes to b.level
    printf("b.name  = %s\n", b.name);
    printf("b.level = %s\n", b.level);

    // "200" is not read by this scanf, it is still waiting in the input
    int leftover;
    if (scanf("%d", &leftover) == 1) {
        printf("still left in input: %d\n", leftover);
    }
    return 0;
}
