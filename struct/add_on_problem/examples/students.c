#include <stdio.h>

#define STUDENT_COUNT 10

struct profile {
    char name[20];
    int age;
};

int main(void) {
    struct profile students[STUDENT_COUNT];

    /* รอบที่ 1: รับข้อมูลให้ครบทุกคนก่อน */
    for (int i = 0; i < STUDENT_COUNT; i++) {
        printf("Student[%d] name then age: ", i);

        /* เว้นวรรคหน้า % ข้าม newline ที่ค้างอยู่ แล้วอ่านชื่อทั้งบรรทัด (ไม่เกิน 19 ไบต์) */
        if (scanf(" %19[^\n]", students[i].name) != 1) {
            return 1;
        }
        if (scanf("%d", &students[i].age) != 1 || students[i].age < 0) {
            return 1;
        }
    }

    /* รอบที่ 2: วนอีกครั้งเพื่อกรองเฉพาะคนอายุมากกว่า 20 */
    printf("\nOlder than 20:\n");
    for (int i = 0; i < STUDENT_COUNT; i++) {
        if (students[i].age > 20) {
            printf("%s,%d\n", students[i].name, students[i].age);
        }
    }
    return 0;
}
