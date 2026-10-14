// Exercise: game character

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
/*
........ showdata(........)
{
    ........
}
*/

void heal20(struct character *x) {
    if (x->potion > 0) {
        x->hp += 20;
        x->potion -= 1;
    }
}

/*
........ damage15(........)
{
    x->hp -= 15;
}
*/

int main(void)
{
    struct character y;
    y = getdata();
    // showdata(y);
    // damage15(&y);
    // damage15(&y);
    // showdata(y);
    heal20(&y);
    // showdata(y);
    return 0;
}
