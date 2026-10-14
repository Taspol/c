// Exercise: game character (solution)

#include <stdio.h>
#include <string.h>

struct character {
    char name[15];
    int hp;
    int potion;
};

struct character getdata(void) {
    struct character x;
    strcpy(x.name, "Knight");
    x.hp = 50;
    x.potion = 3;
    return x;
}

// only reads the data, so passing a copy is enough
void showdata(struct character x)
{
    printf("Name: %s  HP: %d  Potion: %d\n", x.name, x.hp, x.potion);
}

void heal20(struct character *x) {
    if (x->potion > 0) {
        x->hp += 20;
        x->potion -= 1;
    }
}

// changes hp, so it must take a pointer (*x) to change y in main
// x->hp means (*x).hp: go to the struct x points to, then take hp
void damage15(struct character *x)
{
    x->hp -= 15;
}

int main(void)
{
    struct character y;
    y = getdata();
    showdata(y);
    damage15(&y);
    damage15(&y);
    showdata(y);
    heal20(&y);
    showdata(y);
    return 0;
}
