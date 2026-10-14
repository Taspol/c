// Problem 2 (solution)

#include <stdio.h>

struct student {
    char name[15];
    int score[3];
};

// returns a value, so the return type is float
float average(struct student s) {
    int sum = 0;
    for (int j = 0; j < 3; j++) {
        sum += s.score[j];
    }
    return sum / 3.0f;
}

// only prints, returns nothing, so the return type is void
void showstudent(struct student s) {
    printf("%s: %.2f\n", s.name, average(s));
}

int main(void) {
    struct student list[3] = {
        {"Mali", {85, 90, 78}},
        {"Beam", {55, 62, 48}},
        {"Fah",  {72, 68, 80}}
    };

    for (int i = 0; i < 3; i++) {
        showstudent(list[i]);
    }
    return 0;
}
