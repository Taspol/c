// Exercise 2
// there are two mistakes in this program. Please fix them.
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
