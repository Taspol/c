export type Lang = "C" | "CPP";
export const LANGS: readonly Lang[] = ["C", "CPP"];

// Starter code for an empty editor
export const TEMPLATES: Record<Lang, string> = {
  C: `#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    return 0;
}
`,
  CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int a, b;
    cin >> a >> b;
    cout << a + b << "\\n";
    return 0;
}
`,
};
