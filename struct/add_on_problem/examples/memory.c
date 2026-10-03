#include <stdio.h>
#include <stddef.h>

struct profile {
    char name[30];
    float salary;
};

struct choice1 {
    int item;
    double price[3];
};

struct choice3 {
    char name[8];
    float money;
};

int main(void) {
    struct profile people[] = {{"John", 3000}, {"Tiger", 2000}, {"Lisa", 5000}};

    char choice2_grid[3][3];
    int choice2_int;
    int choice4_grid[3][4];
    char choice4_char;

    printf("char=%zu int=%zu float=%zu double=%zu\n",
           sizeof(char), sizeof(int), sizeof(float), sizeof(double));

    size_t people_count = sizeof people / sizeof people[0];
    printf("people=%zu profile=%zu array=%zu salary_offset=%zu\n",
           people_count, sizeof people[0], sizeof people,
           offsetof(struct profile, salary));

    size_t choice2 = sizeof choice2_grid + sizeof choice2_int;
    size_t choice4 = sizeof choice4_grid + sizeof choice4_char;
    printf("choice1=%zu choice2=%zu choice3=%zu choice4=%zu\n",
           sizeof(struct choice1), choice2, sizeof(struct choice3), choice4);
    return 0;
}
