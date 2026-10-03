#include <stdio.h>

// ---- number 1 ----
struct item1 { char code[10]; int quantity; float price; } x1;

// ---- number 2 ----
struct item2 { char name[12]; double price; } x2;

// ---- number 3 ----
int arr[3][5];

// ---- number 4 ----
struct item3 { char title[15]; int page; } x3;

int main(void) {
    printf("sizeof(x1)  = %zu bytes\n", sizeof(x1));
    printf("sizeof(x2)  = %zu bytes\n", sizeof(x2));
    printf("sizeof(arr) = %zu bytes\n", sizeof(arr));
    printf("sizeof(x3)  = %zu bytes\n", sizeof(x3));
    return 0;
}
