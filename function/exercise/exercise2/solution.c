// Exercise 2 (solution)

#include <stdio.h>
#include <string.h>

void getmonth(int m, char y[]) {
    char data[12][10] = {"January", "February", "March", "April",
                         "May", "June", "July", "August",
                         "September", "October", "November", "December"};
    strcpy(y, data[m - 1]); // fixed: was data[m]
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
