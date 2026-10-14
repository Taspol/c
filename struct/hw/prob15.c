#include <stdio.h>

// Problem 15: read 10 people, then show only those older than 20
// Answer:
//   A = 10
//   B = "%19s"          (name is one word, at most 19 bytes + '\0')
//   C = s[i].name       (char array, no & needed)
//   D = &s[i].age       (int, needs &)
//   E = s[i].age > 20   (age 20 is NOT printed)
//   F = s[i].name
//   G = s[i].age
// Last index of s is 9 (indexes 0..9).

struct profile { char name[20]; int age; } s[10];

int main(void) {
    for (int i = 0; i < 10; i++) {                  // A
        scanf("%19s", s[i].name);                   // B, C
        scanf("%d", &s[i].age);                     // D
    }
    for (int i = 0; i < 10; i++) {
        if (s[i].age > 20)                          // E
            printf("%s,%d\n", s[i].name, s[i].age); // F, G
    }
    return 0;
}
