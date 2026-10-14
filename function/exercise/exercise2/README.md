# Exercise 2: month names

## Problem

`problem.c` converts month numbers (1–12) into month names.
**Explain how this program works, and find the wrong point of this program.**
(Hint: error only 2 points)

```c
#include <stdio.h>
#include <string.h>

void getmonth(int m, char y) {
    char data[12][10] = {"January", "February", "March", "April",
                         "May", "June", "July", "August",
                         "September", "October", "November", "December"};
    strcpy(y, data[m]);
}

int main(void) {
    char name[10];
    int i;
    int exam[] = {1, 5, 11};
    for (i = 0; i < 3; i++) {
        getmonth(exam[i], name);
        printf("%s ", name);
    }
    printf("\n");
    return 0;
}
```

Think about it before running:

- Why is `data` declared as `[12][10]`? Is 10 enough for the longest name?
- `getmonth()` returns `void`. How does the month name get back to `name` in `main`?
- What should the program print for `exam[] = {1, 5, 11}`?

## How to run

```bash
cd function/exercise/exercise2
gcc -Wall problem.c -o problem && ./problem
```

The program compiles with no warnings but prints the wrong months. Find out why, then
compare with `solution.c` (the explanation is in the comment at the top):

```bash
gcc -Wall solution.c -o solution && ./solution
```

Expected output after fixing:

```
January May November
```
