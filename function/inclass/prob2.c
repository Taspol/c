// Problem 2: move the code into functions
//
// This program works, but everything is written inside main.
// Rewrite it with these 2 functions, so main only calls them:
//
//   1. average()      return the average of one student's 3 scores
//   2. showstudent()  print one student's name and average
//
// The output must stay the same.

#include <stdio.h>

struct student {
    char name[15];
    int score[3];
};

int main(void) {
    struct student list[3] = {
        {"Mali", {85, 90, 78}},
        {"Beam", {55, 62, 48}},
        {"Fah",  {72, 68, 80}}
    };

    for (int i = 0; i < 3; i++) {
        int sum = 0;
        for (int j = 0; j < 3; j++) {
            sum += list[i].score[j];
        }
        float avg = sum / 3.0f;
        printf("%s: %.2f\n", list[i].name, avg);
    }
    return 0;
}
