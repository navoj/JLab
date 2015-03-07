// Use this block for batch file scripts
@if (@CodeSection == @Batch) @then
@echo off
	cscript //nologo //E:jscript "%~f0" %*
	goto :eof
@end

function main() {
	var args = WScript.Arguments
	var fso, ts;
	var ForReading = 1, ForWriting = 2, ForAppending = 8;
	var xPanel = new Array();
	var yPanel = new Array();
	var xStage = new Array();
	var yStage = new Array();
	var xPanelDim = 0;
	var yPanelDim = 0;
	var xStageDim = 0;
	var yStageDim = 0;

	if (args.length != 2) {
		WScript.echo("Usage: alignpanel panelCoordsFile stageCoordsFile");
		WScript.echo("panelCoordsFile is tab separated data file");
		WScript.echo("stageCoordsFile is tab separated data file");
		return 0;
	} else {
		fso = new ActiveXObject("Scripting.FileSystemObject");

		var panelFile = args(0);
		var stageFile = args(1);
		var panelData = "";
		var stageData = "";
		print("Reading " + panelFile + "...");
		ts = fso.OpenTextFile(panelFile, ForReading);
		while ( !(ts.AtEndOfStream) ) {
			panelData = (ts.ReadLine()).split(" ");
			xPanel.push(panelData[0]);
			yPanel.push(panelData[1]);
			WSH.echo("panelData: " + panelData);
		}
		ts.Close();
		print("Reading " + stageFile + "...");
		ts = fso.OpenTextFile(stageFile, ForReading);		
		while ( !(ts.AtEndOfStream) ) {
			stageData = (ts.ReadLine()).split(" ");
			xStage.push(stageData[0]);
			yStage.push(stageData[1]);
			WSH.echo("stageData: " + stageData);	
		}
		ts.Close();
		return 1;
	}
}

function stageTransform(stage, panel) {
	// stageX = stage(:,1);
	// stageY = stage(:,2);

	var stageX;
	var stageY;
        var SDim = MatrixDim(stage);
	for (var i = 0; i < SDim[0]; i++) {
		stageX.push(stage[i][0]);
		stageY.push(stage[i][1]);
	}

	var offset = [2000.0, -30.0];
	var tolerance = 15.0;
	var stepX = 0.5;
	var stepY = 0.5;

	var Mx = inverseTransform(panel, stageX);
	var My = inverseTransform(panel, stageY);
	var M = [Mx, My];

	error = [0.0, 0.0];
	for (var i = 1; i < SDim[0]; i++) {
		// error = error + (stage(i,:).' - (M * panel(i,:).' + offset));

	}

	return M;
}

function matrixAdd(M,N) {
	var MDim = MatrixDim(M);
	var NDim = MatrixDim(N);
	var result = [];

	if (MDim[0] != NDim[0] || MDim[1] != NDim[1]) {
		return null;
	} else {
		for (var i = 0; i < MDim[0]; i++) {
			result[i] = [];
			for (var j = 0; j < MDim[1]; j++) {
				result[i][j] = M[i][j] + N[i][j];
			}
		}
		return result;
	}
}


function matrixMult(M,N) {
	var MDim = MatrixDim(M);
	var NDim = MatrixDim(N);
	var result = [];

	if (MDim[1] != NDim[0]) {
		return null;
	} else {
		for (var i = 0; i < MDim[0]; i++) {
			result[i] = [];
			for (var j = 0; j < NDim[1]; j++) {
				var sum = 0.0;
				for (var k = 0; k < MDim[1]; k++) {
					sum += M[i][k] * N[k][j];
				}
				result[i][j] = sum;
			}
		}
	}
	return result;
}
	

function inverseTransform(M,N) {
	var MDim = MatrixDim(M);
	var NDim = MatrixDim(N);

	var OK = (MDim[0] == NDim[0]) && (MDim[1] == NDim[1]);

	if (!(OK)) {
		return null;
	}

	// M.' * M 
	var mProd = make_matrix(MDim[0],MDim[1]);
	mProd = matrixMult(transpose(M),M);

	// inverse(M.' * M)
	mProd = inverse(mProd);

	// M.' * N
	var nProd = make_matrix(MDim[0],NDim[0]);
	nProd = matrixMult(transpose(M),N);

	// matrix = inverse(M.' * M) * M.' * N;
	return matrixMult(mProd, nProd);
	
}

// The inverse of a square matrix A with a non zero determinant is the adjoint
// matrix divided by the determinant.
//
// The adjoint matrix is the transpose of the cofactor matrix

function inverse(M) {
	var MDim = MatrixDim(M);
	var iMat = make_matrix(MDim[0],MDim[1]);
	iMat = (1 / determinant(M)) * transpose(cofactor(M));
	return iMat;
}

// Transpose of a square matrix

function transpose(M) {
	var tempM = M;
	var MDim = MatrixDim(M);
	for (var i = 0; i < MDim[0]; i++) {
		for (var j = 0; j < MDim[1]; j++) {
			tempM[i][j] = M[j][i];
		}
	}
	return tempM;
}

// Recursive definitio of determinate using expansion by minors.
// src: https://www.cs.rochester.edu/u/brown/Crypto/assts/projects/adj.html

function determinant(M, n) {
	var i, j, j1, j2;
	var det = 0.0;
	var MDim = MatrixDim(M);
	var detM = make_matrix(n-1,n-1);
	
	if (n < 1) {
		return null;
	} else if (n == 1) {
		det = M[0][0];
	} else if (n == 2) {
		det = M[0][0] * M[1][1] - M[1][0] * M[0][1];
	} else {
		det = 0;
		for (j1 = 0; j1 < n; j1++) {
		for (i=0; i < n-1; i++) { // In C this loop makes malloc memory }
		for (i=1; i < n; i++) {
			j2 = 0;
			for (j = 0; j < n; j++) {
				detM[i-1][j2] = M[i][j];
				j2++;
			}
		}
		det += Math.pow(-1.0,j1+2.0) * M[0][j1] * determinant(detM,n-1);
		}
		return(det);
}

// Find the cofactor matrix of a square matrix
function coFactor(A,n,B) {
	var i, j, ii, jj, i1, j1;
	var det;
	var C = make_matrix(n-1,n-1);
	
	for (j = 0; j < n; j++) {
		for (i = 0; i < n; i++) {
			// Form the adjoint a_ij 
			i1 = 0;
			for (ii=0;ii<n;ii++) {
				if (ii == i) 
					continue;
				j1 = 0;
				for (jj = 0; jj < n; jj++) {
					if (jj == j) 
						continue;
					C[i1][j1] = A[ii][jj];
					j1++;
				}
				i1++;
			}
		
			// Calculate the determinate 
			det = determinate(C,n-1);

			// Fill in the elements of the cofactor
			B[i][j] = Math.pow(-1.0,i+j+2.0) * det;
		}
	}
}
				
		

function printMatrix(M) {
	var MDim = MatrixDim(M);
	var oStr = "[";
	for (var i = 0; i < MDim[0]; i++) {
		oStr = oStr + "\n" + " [";
		for (var j = 0; j < MDim[1]; j++) {
			oStr=oStr + M[i][j] + " ";
		}
		oStr = oStr + "]";
	}
	oStr = oStr + "\n" + "]";
	print(oStr);
}

function MatrixDim(M) {
	var size = new Array(0,0);
	size[0] = M.length;
	if (size[0] >= 1) {
		size[1] = M[0].length;
		if (size[1] == null) {
			size[1] = 1;
		}
	}
	return size;
}

function make_matrix(x,y) {
	var array2D = new Array(x);
	
	for (var i = 0; i < array2D.length; i++) {
		array2D[i] = new Array(y);
	}

	return array2D;
}
	


function print(sData) {
	WScript.echo(sData);
}

function readFile(fileName) {
	// Slurp the entire contents of a file and append to a
	// single string variable. 

	var fso, f1, ts, s;
	var ForReading = 1, ForWriting = 2, ForAppending = 8;
	fso = new ActiveXObject("Scripting.FileSystemObject");
	// Read the contents of the file.
	WScript.echo("Reading file...");
	ts = fso.OpenTextFile(fileName, ForReading);
	s = "";
	while (!(ts.AtEndOfStream)) {
		s = s + ts.ReadLine();
	}
	ts.Close();
	return s;
}

function writeFile(fileName, data) {
	var fso, f;
	var ForReading = 1, ForWriting = 2, ForAppending = 8;
	fso = new ActiveXObject("Scripting.FileSystemObject");
	f = fso.OpenTextFile(fileName, ForWriting, true);
	f.Write(data);
	f.Close();
}

function appendFile(fileName, data) {
	var fso, f;
	var ForReading = 1, ForWriting = 2, ForAppending = 8;
	fso = new ActiveXObject("Scripting.FileSystemObject");
	f = fso.OpenTextFile(fileName, ForAppending, true);
	f.write(data);
	f.Close();
}

