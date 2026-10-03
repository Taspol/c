#include <stdio.h>
#include <string.h>

/* หนังสือโน้ต: ชื่อ ราคา และส่วนลด */
struct book {
    char name[50];
    float price;
    float discount;
};

/* ตำแหน่งตัวการ์ตูนบนโปสเตอร์ */
struct point {
    int x;
    int y;
};

/* นักดนตรีหนึ่งคน มี struct point ซ้อนอยู่ข้างใน */
struct musician {
    char name[30];
    int age;
    char instrument[20];
    struct point sticker;
};

/* ===== เฉลย TODO 1–5 ===== */

/* TODO 1: ตั้งชื่อและราคา แล้วคำนวณส่วนลด 10% จากราคา */
struct book make_book(void) {
    struct book b = {"Keyboard Songs", 200.0f, 0.0f};
    b.discount = b.price * 0.10f;
    return b;
}

/* TODO 2–3: วนครบ n คน พิมพ์เฉพาะคนอายุมากกว่า 20 (20 พอดีไม่ผ่าน) */
void show_older(struct musician band[], int n) {
    for (int i = 0; i < n; i++) {
        if (band[i].age > 20) {
            printf("%s,%d\n", band[i].name, band[i].age);
        }
    }
}

/* TODO 4: แก้แค่ x ส่วน y และข้อมูลอื่นคงเดิม */
struct musician move_right(struct musician hero, int step) {
    hero.sticker.x = hero.sticker.x + step;
    return hero;
}

/* TODO 5: char array ใช้ = ไม่ได้ ต้องใช้ strcpy */
struct musician rename_to_mint(struct musician hero) {
    strcpy(hero.name, "Mint");
    return hero;
}

/* ===== พี่เตรียม main ไว้ให้ ใช้เลือกลองแต่ละภารกิจ ===== */
#ifndef TUTOR_TEST
int main(int argc, char *argv[]) {
    struct musician band[3] = {
        {"Mali", 18, "Violin",   {10, 20}},
        {"Beam", 20, "Keyboard", {0, 5}},
        {"Fah",  23, "Violin",   {30, 40}}
    };

    if (argc != 2) {
        fprintf(stderr, "Usage: tutor book|band|move|rename\n");
        return 1;
    }
    const char *mode = argv[1];

    if (strcmp(mode, "book") == 0) {
        struct book b = make_book();
        float total = b.price - b.discount;
        printf("%s|%.2f|%.2f|%.2f\n", b.name, b.price, b.discount, total);
    } else if (strcmp(mode, "band") == 0) {
        show_older(band, 3);
    } else if (strcmp(mode, "move") == 0) {
        struct musician moved = move_right(band[0], 5);
        printf("%s|%d|%d\n", moved.name, moved.sticker.x, moved.sticker.y);
    } else if (strcmp(mode, "rename") == 0) {
        struct musician renamed = rename_to_mint(band[0]);
        printf("%s|%s\n", renamed.name, renamed.instrument);
    } else {
        fprintf(stderr, "Unknown mode: %s\n", mode);
        return 1;
    }
    return 0;
}
#endif
