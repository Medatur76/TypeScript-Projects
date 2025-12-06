type element = "Row" | "Box" | "Text";
type data = {
    width: number,
    height: number
};
type color = "Black" | "Red" | "Green" | "Gold" | "Blue" | "Purple" | "Cyan" | "White";
const colorMap = {
    "Black": { normal: "30m", bold: "40m" },
    "Red": { normal: "31m", bold: "41m" },
    "Green": { normal: "32m", bold: "42m" },
    "Gold": { normal: "33m", bold: "43m" },
    "Blue": { normal: "34m", bold: "44m" },
    "Purple": { normal: "35m", bold: "45m" },
    "Cyan": { normal: "36m", bold: "46m" },
    "White": { normal: "37m", bold: "47m" }
}
type style = "Bold" | "Underline" | "Reset" | { type: "Background", color: color };
type textOptions = {
    color?: color;
    styles?: style[];
};
type styledString = {
    text: string;
    styleCode?: string;
}
export class ConsoleString {
    private text: string = "";
    public length: number = 0;

    constructor (string: styledString[]) {
        for (const stringI of string) {
            this.text += (stringI.styleCode ?? "") + stringI.text;
            this.length += stringI.text.length;
        }
    }

    public append(string: styledString): ConsoleString {
        this.text += (string.styleCode ?? "") + string.text;
        this.length += string.text.length;
        return this;
    }

    public appends(string: styledString[]): ConsoleString {
        for (const stringI of string) {
            this.text += (stringI.styleCode ?? "") + stringI.text;
            this.length += stringI.text.length;
        }
        return this;
    }

    public appendc(string: ConsoleString): ConsoleString {
        this.text += string.print();
        this.length += string.length;
        return this;
    }

    public appendcs(string: ConsoleString[]): ConsoleString {
        for (const stringI of string) {
            this.text += stringI.print();
            this.length += stringI.length;
        }
        return this;
    }

    public print(): string {
        return this.text;
    }
}
export function textOptionsMap(txtOpt?: textOptions): string {
    if (!txtOpt || (!txtOpt.color && !txtOpt.styles)) return "";
    if (!txtOpt.styles) return "\x1b[0;" + colorMap[txtOpt.color ?? "White"].normal;
    if (txtOpt.styles?.includes("Reset")) return "\x1b[0m";
    let output = "";
    for (const style of txtOpt.styles) {
        output += "\x1b[" + (style == "Bold" ? "1;37m" : style == "Underline" ? "4;37m" : colorMap[(style as { type: "Background", color: color }).color].bold);
    }
    return output + "\x1b[" + colorMap[txtOpt.color ?? "White"].normal;
}

type renderFunc = (self: TUIElementI, width: number, height: number) => ConsoleString[];
type updateFunc = (self: TUIElementI, value: string) => void;

type funcOverride<K> = {
    func: K;
    override: boolean;
};

export interface TUIElementI {
    type: element;
    data: data;
    render: renderFunc;
    update: updateFunc;
}

export interface TUIRowI extends TUIElementI {
    type: "Row";
    objects: {element: TUIElementI, margin_left: number}[];
}

export function genTUIRow(objects?: {element: TUIElementI, margin_left: number}[]): TUIRowI {
    return { type: "Row", objects: objects ?? [], data: { width: objects ? objects.reduce((output, current) => output + current.margin_left + current.element.data.width, 0) : 0, height: objects ? objects.reduce((max, current) => Math.max(max, current.element.data.height), 0) : 0}, render: (self, width, height) => {
        const output: ConsoleString[] = [];
        let targetpos = 0;
        for (const object of (self as TUIRowI).objects) {
            const lines = object.element.render(object.element, width, height);
            targetpos += object.margin_left;
            for (let i = 0; i < lines.length; i++) {
                if (!output[i]) output[i] = new ConsoleString([ { text: "" } ]);
                output[i].append({ text: " ".repeat(targetpos < output[i].length ? 0 : targetpos - output[i].length) }).appendc(lines[i]);
            }
            targetpos += object.element.data.width;
            if (object.element.type == "Box") targetpos += 2;
        }
        return output;
    }, update: (self, value) => (self as TUIRowI).objects.forEach(object => object.element.update(object.element, value)) };
}

export interface TUIBoxI extends TUIElementI {
    type: "Box";
    objects: TUIElementI[];
}

export function genTUIBox(objects?: TUIElementI[], title?: string, opt?: textOptions, updateOverride?: funcOverride<updateFunc>): TUIBoxI {
    return { type: "Box", objects: objects ? objects : [], data: { width: objects ? objects.reduce((max, current) => Math.max(max, current.data.width) + 2, title ? title.length : 0) : title ? title.length : 0, height: (objects ? objects.length : 0) + 2 }, render: (self, width, height) => {
        const style = textOptionsMap(opt), output = [new ConsoleString([{ text: "╭", styleCode: style }])];
        if (title) output[0].append({ text: "─" + title + "─".repeat(self.data.width - title.length - 1)});
        else output[0].append({ text: "─".repeat(self.data.width)});
        output[0].append({ text: "╮" });
        for (const element of (self as TUIBoxI).objects)
            for (const line of element.render(element, width, height)) 
                output.push(new ConsoleString([{ text: "│ " }, { text: "", styleCode: "\x1b[0m" }]).appendc(line).append({ text: " ".repeat(self.data.width - line.length - 1) + "│", styleCode: style }));
        return [...output, new ConsoleString([{ text: "╰" + "─".repeat(self.data.width) + "╯" }, { text: "", styleCode: "\x1b[0m" }])];
    }, update: updateOverride && updateOverride.override ? updateOverride.func : (self, value) => {
        updateOverride ? updateOverride.func(self, value) : null;
        (self as TUIBoxI).objects.forEach(object => object.update(object, value));
        self.data = {
            width: objects ? objects.reduce((max, current) => Math.max(max, current.data.width) + 2, title ? title.length : 0) : title ? title.length : 0,
            height: (objects ? objects.length : 0) + 2
        };
    } };
}

export interface TUITextI extends TUIElementI {
    type: "Text";
    value: string;
}

export function genTUIText(value: string, opt?: textOptions, updateOverride?: funcOverride<updateFunc>): TUITextI {
    return { type: "Text", data: { width: value.split("\n").reduce((max, value) => Math.max(max, value.length), 0), height: value.split("\n").length }, value: value, render: (self, _width, _height) => (self as TUITextI).value.split("\n").map((value) => new ConsoleString([{ text: value, styleCode: textOptionsMap(opt) }]).append({ text: "", styleCode: "\x1b[0m" })), update: updateOverride ? updateOverride.func : (_self, _value) => null };
}

export class TUI {
    private elements: TUIElementI[] = [];
    private encoder = new TextEncoder;

    constructor(elements?: TUIElementI[]) {
        if (elements) this.elements = elements;
    }

    public write(message: string) {
        Deno.stdout.writeSync(this.encoder.encode(message));
    }

    public start(hideCursor?: boolean): void {
        // Set terminal to raw mode
        Deno.stdin.setRaw(true);
        if (hideCursor) this.write('\x1b[?25l');
    }

    public render(): void {
        const {columns, rows} = Deno.consoleSize();
        const output: string[] = [];
        for (const element of this.elements)
            element.render(element, columns, rows).forEach(value => output.push(value.print()));
        let out = '';
        for (let i = 0; i < rows && i < output.length; i++) {
            out += output[i] + "\n";
        }
        console.clear();
        this.write(out);
    }

    public update(value: string): void {
        for (const element of this.elements)
            element.update(element, value);
    }
}