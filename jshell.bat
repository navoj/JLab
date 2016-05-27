@set @junk=1 /*
@echo off
cscript //nologo //E:jscript %~f0 %*
goto :eof
*/

function hex(n) {
	if (n >= 0) {
		return n.toString(16);
	} else {
		n += 0x100000000;
		return n.toString(16);
	}
}

var scriptText;
var previousLine;
var line;
var result;
while (true) {
	WScript.StdOut.Write("jscript> ");
	if (WScript.StdIn.AtEndOfStream) {
		WScript.Echo("Bye.");
		break;
	}
	line = WScript.StdIn.ReadLine();
	scriptText = line + "\n";
	if (line === "") {
		WScript.Echo(
			"Enter two consecutive blank lines to terminate multi-line input.");
	do {
		if (WScript.StdIn.AtEndOfStream) {
			break;
		}
		previousLine = line;
		line = WScript.StdIn.ReadLine();
		line += "\n";
		scriptText += line;
	} while (previousLine != "\n" || line != "\n");

}
try {
	result = eval(scriptText);
} catch (error) {
	WScript.Echo("0x" + hex(error.number) + " " + error.name + ": " + error.message);
}

if (result) {
	try {
		WScript.Echo(result);
	} catch (error) {
		WScript.Echo("<<<unprintable>>>");
	}
}

result = null;
}