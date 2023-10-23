
function showCode(code: string = ""): void {
  figma.showUI(
    __html__.replace(/##CODE##/, code),
    {width: 512, height: 512}
  );
}


function componentToHex(c: number) {
  var hex = Math.round(c).toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
function toHtmlColor(rgb: RGBA | RGB) {
  if ('a' in rgb) {
    return "#" + componentToHex(rgb.r * 255.0) + componentToHex(rgb.g * 255.0) + componentToHex(rgb.b * 255.0) + componentToHex(rgb.a * 255.0);
  }
  return "#" + componentToHex(rgb.r * 255.0) + componentToHex(rgb.g * 255.0) + componentToHex(rgb.b * 255.0); 
}


function titleCase(str: string): string {
  let result = str.toLowerCase().split(' ');
  for (var i = 0; i < result.length; i++) {
    result[i] = result[i].charAt(0).toUpperCase() + result[i].slice(1);
  }
  return result.join(' ');
}

let fontStyleMapping: any = {
  Thin: 100,
  ThinItalic: 100,
  ExtraLight: 200,
  ExtraLightItalic: 200,
  Light: 300,
  LightItalic: 300,
  Regular: 400,
  RegularItalic: 400,
  Medium: 500,
  MediumItalic: 500,
  SemiBold: 600,
  SemiBoldItalic: 600,
  Bold: 700,
  BoldItalic: 700,
  ExtraBold: 800,
  ExtraBoldItalic: 800,
  Black: 900,
  BlackItalic: 900,
};


var text = "";
var tagName = "";
var nodeChildren: Array<string> = [];
var classes: Array<string> = [];
var styles: Array<string> = [];
var attributes: any = {};
var indent = 0;
var at = { x: 0, y: 0 };
var atStack: any[] = [];


function ind() {
  return "  ".repeat(indent);
}

function cls(className: string) {
  classes.push(className);
}

function style(styleName: string) {
  styles.push(styleName);
}

function attr(name: string, value: string) {
  attributes[name] = value;
}

function strAttr(name: string, value: string) {
  attributes['"' + name + '"'] = value;
}

function int(num: number): number {
  return Math.floor(num);
}

function child(text: string) {
  nodeChildren.push(text);
}


function fillText(hasChildren: boolean = true) {
  indent--;
  text += ind() + tagName;
  const twoDots = hasChildren ? ":" : "";
  if (classes.length !== 0 || styles.length !== 0 || attributes) {
    text += `(\n${ind()}`;
    if (classes.length > 0) {
      text += `  class = "${classes.join(" ")}",\n${ind()}`;
    }
    if (styles.length > 0) {
      text += `  style = "${styles.join(" ")}",\n${ind()}`;
    }
    for (const key in attributes) {
      text += `  ${key} = "${attributes[key]}",\n${ind()}`;
    }
    text += `)${twoDots}\n`;
  } else {
    text += `${twoDots}\n`
  }
  indent++;
  text += nodeChildren.join("");
}


function visitFill(fill: SolidPaint | ImagePaint, nodeType: string) {
  if ('color' in fill && fill.color !== undefined && fill.visible) {
    if (nodeType === "TEXT") {
      cls(`text-[${toHtmlColor(fill.color)}]`);
    } else {
      cls(`bg-[${toHtmlColor(fill.color)}]`);
    }
  }
}

function visitStroke(fill: Paint, nodeType: string) {
  if ('color' in fill && fill.color != undefined) {
    if (nodeType === "VECTOR") {
      cls(`stroke-[${toHtmlColor(fill.color)}]`);
    } else {
      cls(`border-[${toHtmlColor(fill.color)}]`);
    }
  }
}


function visitEffect(effect: Effect) {
  if (effect.type === "DROP_SHADOW" && effect.visible) {
    let spread = effect.spread ? effect.spread : 1.0
    style(`filter: drop-shadow(${(effect.offset.x * 3.0).toFixed(2)}px ${(effect.offset.y * 3.0).toFixed(2)}px ${(effect.radius * spread).toFixed(2)}px ${toHtmlColor(effect.color)});`);
  }
  else if (effect.type === "INNER_SHADOW" && effect.visible) {
    style(`box-shadow: inset ${toHtmlColor(effect.color)} ${effect.offset.x} ${effect.offset.y} ${effect.radius};`);
  }
  else if (effect.type === "LAYER_BLUR" && effect.visible) {
    style(`filter: blur(${effect.radius}px)`);
  }
  else if (effect.type === "BACKGROUND_BLUR" && effect.visible) {
    style(`backdrop-filter: blur(${effect.radius}px)`);
  }
}


async function visit(node: any, first: boolean = true, inContainer: boolean = false) {
  if (!node.visible || node.name.includes('.ignore')) return;

  nodeChildren = [];
  classes = [];
  styles = [];
  attributes = {};

  switch (node.type) {
    case "VECTOR":
      tagName = `tPath`;
      break;
    default:
      tagName = `tDiv`;
      break;
  }
  indent += 1;
  let isVectorFrame = true;

  if (node.children !== undefined) {
    node.children.forEach((e: any) => {
      if (e.type !== "VECTOR") {
        isVectorFrame = false;
      }
    })
    if (isVectorFrame) {
      cls("fill-transparent")
      tagName = "tSvg"
    }
  } else {
    isVectorFrame = false;
  }

  if (node.type !== "VECTOR") {
    if (!first && !inContainer) {
      cls("absolute");
      cls(`left-[${int(node.x - at.x)}px]`);
      cls(`top-[${int(node.y - at.y)}px]`);
    }
    cls(`w-[${int(node.width)}px]`);
    cls(`h-[${int(node.height)}px]`);
  } else {
    attr("transform", `translate(${int(node.x - at.x)}, ${int(node.y - at.y)})`)
  }

  if ('rotation' in node && node.rotation !== 0.0) {
    cls(`rotate-[${node.rotation.toFixed(2)}deg]`);
    cls(`origin-center`);
  }

  if (node.clipsContent !== undefined && node.clipsContent) {
    cls(`overflow-hidden`);
  }

  // if (node.constraints) {
  //   if (node.constraints.horizontal != "MIN" || node.constraints.vertical != "MIN") {
  //     childText += ind() + `constraints c${titleCase(node.constraints.horizontal)}, c${titleCase(node.constraints.vertical)}\n`;
  //   }
  // }

  if (node.type == "INSTANCE") {
    child(ind() + `image ${node.name + ".png"}\n`);
    indent -= 1;
    return;
  }
  if (node.exportSettings.length > 0) {
    child(ind() + `image ${node.name + ".png"}\n`);
    indent -= 1;
    return;
  }

  if ('vectorPaths' in node) {
    indent++;
    node.vectorPaths.forEach((e: any) => {
      strAttr("d", e.data);
      strAttr("fill-rule", e.windingRule.toString().toLowerCase());
    });
    indent--;
  }

  // FILL
  if (node.fills != undefined && node.fills != figma.mixed) {
    for (let fill of node.fills) {
      visitFill(fill, node.type);
      
      // ImagePaint
      if ('imageHash' in fill && fill.imageHash !== undefined) {
        tagName = "tImg";
        const img = await figma.getImageByHash(fill.imageHash).getBytesAsync();
        attr("src", "data:image/jpeg;base64," + figma.base64Encode(img));
      }
      // Gradient Paint

    }
  }

  // STROKE
  if (node.strokes != undefined && node.strokes != figma.mixed) {
    for (let stroke of node.strokes) {
      visitStroke(stroke, node.type);
    }

    if (node.strokes.length !== 0 && node.type !== "VECTOR" && node.type !== "TEXT" && node.strokeWeight !== undefined) {
      if (node.strokeWeight === figma.mixed) {
        if (node.strokeTopWeight > 0)
          cls(`border-t-[${int(node.strokeTopWeight)}px]`);
        if (node.strokeBottomWeight > 0)
          cls(`border-b-[${int(node.strokeBottomWeight)}px]`);
        if (node.strokeLeftWeight > 0)
          cls(`border-l-[${int(node.strokeLeftWeight)}px]`);
        if (node.strokeRightWeight > 0)
          cls(`border-r-[${int(node.strokeRightWeight)}px]`);
      } else if (node.strokeWeight > 0) {
        cls(`border-[${int(node.strokeWeight)}px]`);
      }
    }
    if (node.strokeCap !== "NONE" && node.type === "VECTOR") {
      if (node.strokeCap === "ROUND") {
        strAttr("stroke-linecap", "round");
      } else if (node.strokeCap === "SQUARE") {
        strAttr("stroke-linecap", "square");
      }
    }
    if (node.strokeJoin !== "MITER" && node.type === "VECTOR") {
      if (node.strokeCap === "ROUND") {
        strAttr("stroke-linejoin", "round");
      } else if (node.strokeCap === "BEVEL") {
        strAttr("stroke-linejoin", "bevel");
      }
    }
  }
  
  if ('cornerRadius' in node) {
    if (node.cornerRadius === figma.mixed) {
      cls(`rounded-tl-[${int(node.topLeftRadius)}px]`);
      cls(`rounded-tr-[${int(node.topRightRadius)}px]`);
      cls(`rounded-bl-[${int(node.bottomLeftRadius)}px]`);
      cls(`rounded-br-[${int(node.bottomRightRadius)}px]`);
    } else if (node.cornerRadius !== 0) {
      cls(`rounded-[${int(node.cornerRadius)}px]`);
    }
  }

  // if (node.strokeWeight != undefined) {
  //   if (node.strokeWeight != 0 && node.strokes.length != 0) {
  //     text += ind() + `strokeWeight ${node.strokeWeight}\n`;
  //   }
  // }

  if (node.layoutMode === "VERTICAL" || node.layoutMode === "HORIZONTAL") {
    inContainer = true;
    cls(`flex`);
    if (node.layoutMode === "VERTICAL") {
      cls(`flex-col`);
    }
    // PADDING
    cls(`pt-[${int(node.paddingTop)}px]`);
    cls(`pb-[${int(node.paddingBottom)}px]`);
    cls(`pl-[${int(node.paddingLeft)}px]`);
    cls(`pr-[${int(node.paddingRight)}px]`);
    cls(`gap-[${int(node.itemSpacing)}px]`);

    // LAYOUT ALIGNMENT
    switch (node.primaryAxisAlignItems) {
      case 'MIN':
        cls(`justify-start`);
        break;
      case 'CENTER':
        cls(`justify-center`);
        break;
      case 'MAX':
        cls(`justify-end`);
        break;
      case 'SPACE_BETWEEN':
        cls(`justify-around`);
        break;
    }
    switch (node.counterAxisAlignItems) {
      case 'MIN':
        cls(`items-start`);
        break;
      case 'CENTER':
        cls(`items-center`);
        break;
      case 'MAX':
        cls(`items-end`);
        break;
      case 'SPACE_BETWEEN':
        cls(`items-around`);
        break;
    }
  }
  
  if (node.type === "TEXT") {
    
    let fontFamily = JSON.stringify(node.fontName.family);
    var lineHeight = 0;
    if (node.lineHeight.unit == "PIXELS") {
      lineHeight = node.lineHeight.value;
    }
    let fontWeight = fontStyleMapping[node.fontName.style];
    var h = "text-center";
    if (node.textAlignHorizontal === "LEFT")
      h = "text-left";
    if (node.textAlignHorizontal === "RIGHT")
      h = "text-right";
    var v = "align-middle";
    if (node.textAlignVertical === "TOP")
      v = "align-top";
    if (node.textAlignVertical === "BOTTOM")
      v = "align-bottom";
    cls(`text-[${int(node.fontSize)}px]`);
    if (int(lineHeight) !== 0)
      cls(`leading-[${int(lineHeight)}px]`);
    cls(v);
    cls(h);
  }

  // if (node.layoutAlign && node.layoutAlign !== "MIN") {
  //    text += `layoutAlign la${titleCase(node.layoutAlign)}\n`;
  // }

  if (node.effects != undefined) {
    for (let effect of node.effects) {
      visitEffect(effect);
    }
  }
  
  if (node.type === "TEXT") {
    child(ind() + JSON.stringify(node.characters) + "\n");
  }

  if ('children' in node && node.children.length !== 0) {
    fillText(true);

    if (node.type == "GROUP") {
      atStack.push({ x: at.x, y: at.y });
      at.x = node.x;
      at.y = node.y;
    }
    const children = node.children.slice();
    for (let i = 0; i < children.length; ++i) {
      await visit(children[i], false, inContainer)
    }
    if (node.type == "GROUP") {
      at = atStack.pop();
    }
  } else if (nodeChildren.length === 0) {
    fillText(false);
  } else {
    fillText(true);
  }

  indent--;
}


showCode("# Here will be generated source code");


function generateFromFrame() {
  const selection = figma.currentPage.selection;
  
  if (selection.length !== 1 || selection[0].type !== "FRAME") {
    return;
  }

  const frame = selection[0];
  indent = 2;
  text = "";
  visit(frame).then(_ => {
  let code = `import happyx


component ${titleCase(frame.name)}:
  \`template\`:
${text}
`;

    figma.ui.postMessage(code);
  });
}


figma.ui.onmessage = (e) => {
  if (!('target' in e)) return;

  switch (e.target) {
    case 'frame':
      generateFromFrame();
      break;
    default:
      break;
  }
}
