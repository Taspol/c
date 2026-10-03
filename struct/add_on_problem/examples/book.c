#include <stdio.h>
#include <string.h>

struct book {
    char name[50];
    float price;
    float discount;
};

int main(void) {
    struct book b;

    /* รับชื่อทั้งบรรทัดด้วย fgets เพื่อให้ชื่อที่มีช่องว่างได้ครบ แล้วตัด newline ทิ้ง */
    printf("Enter book name: ");
    if (fgets(b.name, sizeof b.name, stdin) == NULL) {
        fprintf(stderr, "Could not read book name\n");
        return 1;
    }
    b.name[strcspn(b.name, "\n")] = '\0';

    printf("Enter book price: ");
    if (scanf("%f", &b.price) != 1 || b.price < 0) {
        fprintf(stderr, "Price must be a number >= 0\n");
        return 1;
    }

    b.discount = 0.10f * b.price;
    float total = b.price - b.discount;

    printf("\n");
    printf("Book: %s\n", b.name);
    printf("Price: %.2f\n", b.price);
    printf("Discount 10 percent: %.2f\n", b.discount);
    printf("Total price: %.2f\n", total);
    return 0;
}
