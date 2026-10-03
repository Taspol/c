#include <stdio.h>

// initial struct
struct book {
    char title[20];
    int pages;
};

// declare struct variable
struct book library[ ] = {{"Math", 150}, {"Physics", 200}};


int main(void) {
    // ---- finding books ----
    size_t size_of_book = sizeof(struct book);
    printf("sizeof(struct book) = %zu bytes\n", size_of_book);

    // ---- finding size of library ----
    size_t size_of_library = sizeof(library);
    printf("sizeof(library)     = %zu bytes\n", size_of_library);
    
    // ---- finding total book in library ----
    int count = sizeof (library) / sizeof (library[0]);
    printf("Number of books     = %d\n", count);

    // ---- print the result ----
    for (int i = 0; i < count; i++) {
        printf("library[%d]: title=%s pages=%d\n", i, library[i].title, library[i].pages);
    }
    return 0;
}
