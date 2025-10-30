function _instanceof(left, right) {
  if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]){
    return !!right[Symbol.hasInstance](left);
  } else {
    return left instanceof right;
  }
}

function supportsElement(element) {
  return !_instanceof(document.createElement(element), HTMLUnknownElement);
}

function supportsElementAttribute(element, attribute) {
  var elem = document.createElement(element);
  return attribute in elem;
}

function supportsAPI(api) {
  return eval("window." + api) !== undefined;
}

function HTMLElementSupport() {
  var result = {};
  var i_elements = 0;
  var n_elements = 0;
  var i_attributes = 0;
  var n_attributes = 0;

  for (var element in html_elements["html"]["elements"]) {
    n_elements++; // Check whether to ignore deprecated elements

    result[element] = supportsElement(element)

    for (var key in html_elements["html"]["elements"][element]) {
      if (key === "__compat") {
        continue;
      }

      n_attributes++; // Check whether to ignore deprecated attributes

      if (key.indexOf("_") < 0) {
        if (supportsElementAttribute(element, key)) {
          if ("__compat" in html_elements["html"]["elements"][element][key]) {
            result[element + "_" + key] = true;
          } else {
            console.log("No '__compat' found for " + element + " + " + key);
            continue;
          }
        } else {
          result[element + "_" + key] = false;
        }
      }

      i_attributes++;
    }

    i_elements++;
  }

  console.log("Checked " + i_elements + "/" + n_elements + " supported HTML elements");
  console.log("Checked " + i_attributes + "/" + n_attributes + " supported HTML element attributes");
  return result;
}

function JsApiSupport() {
  var result = {};
  var i = 0;
  var n = 0;

  for (var api in apis["api"]) {
    n++;

    result[api] = supportsAPI(api)
    i++;
  }

  console.log("Checked " + i + "/" + n + " supported JavaScript APIs");
  return result;
}