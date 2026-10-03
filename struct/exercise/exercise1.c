#include <stdio.h>
#include <string.h>

// initial struct
struct student {
    int id;
    char name[20];
    float gpa;
};

// declare struct variable
struct student s1 = {101, "Alice", 3.75};

int main(void) {
    printf("Before: id=%d name=%s gpa=%.2f\n", s1.id, s1.name, s1.gpa);
    
    // choice 1
    s1.gpa = 3.90;

    // choice 2
    s1.id = 102;

    // choice 3
    s1.name[0] = 'B';

    // choice 4
    // s1.name = "Bob";   // invalid in C, cannot assign to array
    strcpy(s1.name, "Bob"); // valid way to change name

    // choice 5
    s1.gpa = s1.gpa + 0.1;

    printf("After:  id=%d name=%s gpa=%.2f\n", s1.id, s1.name, s1.gpa);
    return 0;
}
