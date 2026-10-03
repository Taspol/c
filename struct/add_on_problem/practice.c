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

/* ===== ส่วนที่น้องเติม: ไม่ต้องเปลี่ยนชื่อฟังก์ชันหรือชนิดข้อมูล ===== */

/* 
TODO 1: เปลี่ยนค่าเริ่มต้นเป็น Keyboard Songs ราคา 200
        แล้วคำนวณส่วนลด 10% เก็บใน b.discount 
*/
struct book make_book(void) {
    struct book b = {"", 0.0f, 0.0f};
    //--- เติมโค้ดตรงนี้ ---

    return b;
}

/* 
TODO 2: วน i ตั้งแต่ 0 ขณะ i < n
TODO 3: ถ้า band[i].age > 20 ให้พิมพ์ชื่อ,อายุ ตามรูปแบบ
        printf("%s,%d\n", band[i].name, band[i].age); 
*/
void show_older(struct musician band[], int n) {
    //--- เติมโค้ดตรงนี้ ---
    
}

/* TODO 4: เพิ่ม hero.sticker.x ด้วย step โดยไม่เปลี่ยน y */
struct musician move_right(struct musician hero, int step) {
    //--- เติมโค้ดตรงนี้ ---

    return hero;
}

/* TODO 5: เปลี่ยน hero.name เป็น Mint ด้วย strcpy */
struct musician rename_to_mint(struct musician hero) {
    //--- เติมโค้ดตรงนี้ ---

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
