let fs = require("fs") ;
let os = require("os") ;

function getTempDir() {
	
	return new Promise(resolve=>{
		
		fs.mkdtemp(`${os.tmpdir()}/jpp-t-`,(err,temp)=>{
			
			if (err) {
				
				reject(err) ;
				
			}
			
			else {
				
				resolve(temp) ;
				
			}
			
		}) ;
		
	}) ;
	
}

function package(dir,outFile,deflate=true) {
	
	return new Promise(resolve=>{
		
		let dirs = new Array() ;
		let files = new Array() ;
		let addFiles = dd => new Promise((resolve,reject)=>{
			
			console.log("addFiles") ;
			dirs.push(dd) ;
			fs.readdir(dd,(err,d)=>{
				
				let doing = -1 ;
				let next =_=> {
					
					doing++ ;
					if (doing >= d.length) {
						
						console.log("resolveing") ;
						resolve([dirs,files]) ;
						return ;
						
					}
					let thisFile = `${dd}/${d[doing]}` ;
					console.log(thisFile) ;
					fs.stat(thisFile,(err,stats)=>{
						
						if (err) {
							
							reject(err) ;
							return ;
							
						}
						
						if (stats.isFile()) {
							
							files.push(thisFile) ;
							next() ;
							
						}
						
						else {
							
							addFiles(thisFile).then(next) ;
							
						}
						
					}) ;
					
				} ;
				next() ;
				
			}) ;
			
		}) ;
		let origDir = process.cwd() ;
		process.chdir(dir) ;
		addFiles(".").then(args=>new Promise((resolve,reject)=>{
			
			let files = args[1] ;
			let tempPipe = fs.createWriteStream(tempDir + "/jpp-temp.tjpp") ;
			let filesArray = new Array() ;
			let currentPosition = 0 ;
			let doing = -1 ;
			let next =_=> {
				
				doing++ ;
				if (doing >= files.length) {
					
					tempPipe.end() ;
					resolve([args[0],filesArray]) ;
					return ;
					
				}
				console.log("now loading",files[doing]) ;
				filesArray.push(files[doing]) ;
				fs.stat(files[doing],(err,stats)=>{
					
					if (err) {
						
						reject(err) ;
						return ;
						
					}
					filesArray.push(currentPosition,currentPosition+=stats.size-1) ;
					currentPosition++ ;
					let thisRead = fs.createReadStream(files[doing]) ;
					thisRead.on("data",d=>tempPipe.write(d)) ;
					thisRead.on("end",next) ;
					
				}) ;
				
			} ;
			next() ;
			
		})).then(args=>{
			
			let dirs = args[0] ;
			let filesArray = args[1] ;
			process.chdir(origDir) ;
			let fileContents = `jpp-f\r\n${JSON.stringify(dirs).substring(1,JSON.stringify(dirs).length-1)}\r\n${JSON.stringify(filesArray).substring(1,JSON.stringify(filesArray).length-1)}\r\n` ;
			let outF = fs.createWriteStream(outFile) ;
			let out ;
			if (deflate) {
				
				out = require("zlib").createDeflate() ;
				out.pipe(outF) ;
				
			}
			else {
				
				out = outF ;
				
			}
			out.write(fileContents) ;
			let tempIn = fs.createReadStream(tempDir + "/jpp-temp.tjpp") ;
			tempIn.pipe(out) ;
			console.log("DONE!") ;
			
		}).catch(console.warn) ;
		
	}) ;
	
}

function map(dir,outFile,deflate=true) {
	
	let dirs = new Array() ;
	let files = new Array() ;
	let addFiles = dd => new Promise((resolve,reject)=>{
		
		console.log("addFiles") ;
		dirs.push(dd) ;
		fs.readdir(dd,(err,d)=>{
			
			let doing = -1 ;
			let next =_=> {
				
				doing++ ;
				if (doing >= d.length) {
					
					process.chdir(origDir) ;
					console.log("resolveing") ;
					resolve({
						
						dirs:dirs,
						files:files,
						wDir:dir
						
					}) ;
					return ;
					
				}
				let thisFile = `${dd}/${d[doing]}` ;
				console.log(thisFile) ;
				fs.stat(thisFile,(err,stats)=>{
					
					if (err) {
						
						reject(err) ;
						return ;
						
					}
					
					if (stats.isFile()) {
						
						files.push(thisFile) ;
						next() ;
						
					}
					
					else {
						
						addFiles(thisFile).then(next) ;
						
					}
					
				}) ;
				
			} ;
			next() ;
			
		}) ;
		
	}) ;
	let origDir = process.cwd() ;
	process.chdir(dir) ;
	return addFiles(".") ;
	
}

function addFIles(outF,type,meta,dirs,files,wDir,deflate=true) {
	
	return new Promise((resolve,reject)=>{
		
		let origDir = process.cwd() ;
		process.chdir(wDir) ;
		let tempPipe = fs.createWriteStream(tempDir + "/jpp-temp.tjpp") ;
		let filesArray = new Array() ;
		let currentPosition = 0 ;
		let doing = -1 ;
		let next =_=> {
			
			doing++ ;
			if (doing >= files.length) {
				
				tempPipe.end() ;
				{
					
					process.chdir(origDir) ;
					let lenS = new String() ;
					if (meta.length > 0) {
						
						lenS = `-${meta.length}` ;
						
					}
					let fileContents1 = `jpp-${type}${lenS}\r\n` ;
					let fileContents2 = `${JSON.stringify(dirs).substring(1,JSON.stringify(dirs).length-1)}\r\n${JSON.stringify(filesArray).substring(1,JSON.stringify(filesArray).length-1)}\r\n` ;
					let out ;
					if (deflate) {
						
						out = require("zlib").createDeflate() ;
						out.pipe(outF) ;
						
					}
					else {
						
						out = outF ;
						
					}
					out.write(fileContents1) ;
					out.write(meta) ;
					out.write(fileContents2) ;
					let tempIn = fs.createReadStream(tempDir + "/jpp-temp.tjpp") ;
					tempIn.pipe(out) ;
					console.log("DONE!") ;
					resolve() ;
				}
				return ;
				
			}
			console.log("now loading",files[doing]) ;
			filesArray.push(files[doing]) ;
			fs.stat(files[doing],(err,stats)=>{
				
				if (err) {
					
					reject(err) ;
					return ;
					
				}
				filesArray.push(currentPosition,currentPosition+=stats.size-1) ;
				currentPosition++ ;
				let thisRead = fs.createReadStream(files[doing]) ;
				thisRead.on("data",d=>tempPipe.write(d)) ;
				thisRead.on("end",next) ;
				
			}) ;
			
		} ;
		next() ;
		
	}) ;
	
}

function unPackage(file,deflated=true) {
	
	return new Promise(resolve=>{
		
		if (deflated) {
			
			let inflator = require("zlib").createInflate() ;
			console.log("OK") ;
			inflator.pipe(fs.createWriteStream(tempDir + "/jpp-temp.tjpp")) ;
			fs.createReadStream(file).pipe(inflator) ;
			inflator.on("end",_=>{
				
				unPackage(tempDir + "/jpp-temp.tjpp",false).then(resolve) ;
				
			}) ;
			return ;
		}
		
		let fileRead = fs.createReadStream(file) ;
		let fileSoFar = Buffer.from([]) ;
		let dirs = new Array() ;
		let files = new Array() ;
		let meta, data ;
		let waitingFor = 0 ;
		let stage = 0 ;
		let headerLen = 0 ;
		let stages = [
			
			_=>{
				
				if (fileSoFar.indexOf(Buffer.from("\r\n")) !== -1) {
					
					meta = fileSoFar.slice(0,fileSoFar.indexOf(Buffer.from("\r\n"))).toString().split("-") ;
					headerLen += fileSoFar.indexOf(Buffer.from("\r\n")) + 2 ;
					fileSoFar = fileSoFar.slice(fileSoFar.indexOf(Buffer.from("\r\n"))+2,fileSoFar.length) ;
					console.log("Meta:",meta) ;
					stage+=2 ;
					
					if (typeof meta[2] !== "undefined") {
						
						stage-- ;
						headerLen += parseInt(meta[2]) ;
						waitingFor = parseInt(meta[2]) ;
						
					}
					
					return false ;
					
				}
				
			},
			
			_=>{
				
				if (fileSoFar.length >= waitingFor) {
					
					data = fileSoFar.slice(0,waitingFor) ;
					fileSoFar = fileSoFar.slice(waitingFor,fileSoFar.length) ;
					stage++ ;
					
				}
				return false ;
				
			},
			
			_=>{
				
				if (fileSoFar.indexOf(Buffer.from("\r\n")) !== -1) {
					
					dirs = JSON.parse(`[${fileSoFar.slice(0,fileSoFar.indexOf(Buffer.from("\r\n")))}]`) ;
					headerLen += fileSoFar.indexOf(Buffer.from("\r\n")) + 2 ;
					fileSoFar = fileSoFar.slice(fileSoFar.indexOf(Buffer.from("\r\n"))+2,fileSoFar.length) ;
					console.log(dirs) ;
					stage++ ;
					return false ;
					
				}
				
			},
			
			_=>{
				
				if (fileSoFar.indexOf(Buffer.from("\r\n")) !== -1) {
					
					files = JSON.parse(`[${fileSoFar.slice(0,fileSoFar.indexOf(Buffer.from("\r\n")))}]`) ;
					headerLen += fileSoFar.indexOf(Buffer.from("\r\n")) + 2 ;
					fileSoFar = fileSoFar.slice(fileSoFar.indexOf(Buffer.from("\r\n"))+2,fileSoFar.length) ;
					console.log(files) ;
					return true ;
					
				}
				
			}
			
		] ;
		fileRead.on("data",d=>{
			
			fileSoFar = Buffer.concat([fileSoFar,d]) ;
			origStage = -1 ;
			while (origStage!==stage) {
				
				origStage = stage ;
				if (stages[stage]()) {
					
					fileRead.close() ;
					console.log("Res") ;
					resolve([file,meta,data,dirs,files,headerLen]) ;
					
				}
				
			}
			
		}) ;
		
	}) ;
	
}

function packager(mode,...args) {
	
	if (mode === "f") {
		
		package(...args) ;
		
	}
	
	else if (mode === "nio") {
		
		console.log("NIO") ;
		
	}
	
}

function createPackage(ob,stream,deflate=true) {
	
	return addFIles(stream,ob.type,ob.data,ob.dirs,ob.files,ob.wDir,deflate) ;
	
}

function unpackFiles(file,dirs,files,headerLen,out) {
	
	return new Promise(resolve=>{
		
		fs.mkdir(out,_=>{
			
			process.chdir(out) ;
			let doing = 0 ;
			let next =_=> {
				
				doing++ ;
				if (doing >= dirs.length) {
					
					doing = -1 ;
					//console.log(doing) ;
					next =_=> {
						
						if (doing+3 >= files.length) {
							
							console.log("Done!") ;
							resolve() ;
							return ;
							
						}
						
						//console.log(files) ;
						let writeTo = files[++doing] ;
						//console.log(doing) ;
						//console.log("makingWrite",writeTo)
						let writer = fs.createWriteStream(writeTo) ;
						let readArgs = [file,{start:files[++doing]+headerLen,end:files[++doing]+headerLen}] ;
						//console.log("Making read",...readArgs) ;
						let reader = fs.createReadStream(...readArgs) ;
						reader.pipe(writer) ;
						reader.on("end",next) ;
						
					} ;
					next() ;
					return ;
					
				}
				fs.mkdir(dirs[doing],_=>{
					
					next() ;
					
				}) ;
				
			} ;
			next() ;
			
		}) ;
		
	}) ;
	
}

function getFileNice(ob,file) {
	
	return getFile(ob.path,ob.files,file,ob.headerLen) ;
	
}

function getFile(file,files,toGet,headerLen) {
	
	toGet = files.indexOf(toGet) ;
	return new Promise((resolve,reject)=>{
		
		let readArgs = [file,{start:files[toGet+1]+headerLen,end:files[toGet+2]+headerLen}] ;
		
		fs.open(file,"r",(err,fd)=>{
			
			if (err) {
				
				reject(err) ;
				return ;
				
			}
			
			let data = Buffer.alloc(files[toGet+2]-files[toGet+1]) ;
			fs.read(fd,data,0,files[toGet+2]-files[toGet+1],files[toGet+1]+headerLen,err=>{
				
				if (err) {
					
					reject(err) ;
					return ;
					
				}
				
				resolve(data) ;
				
			}) ;
			
		}) ;
		
	}) ;
	
}

function readPackage(file) {
	
	return new Promise(resolve=>{
		
		fs.realpath(file,(err,path)=>{
			
			unPackage(path).then(d=>{
				
				console.log("YEAH") ;
				let fileNames = new Array() ;
				for (let doing = 0 ; doing < d[4].length ; doing+=3) {
					
					fileNames.push(d[4][doing]) ;
					
				}
				resolve({
					
					realpath:path,
					path:d[0],
					type:d[1][1],
					data:d[2],
					dirs:d[3],
					files:d[4],
					headerLen:d[5],
					fileNames:fileNames
					
				}) ;
				
			}) ;
			
		}) ;
		
	}) ;
	
}

function unpackFilesF(ob,out) {
	
	return unpackFiles(ob.path,ob.dirs,ob.files,ob.headerLen,out).then(_=>ob) ;
	
}



let tempDir ;

module.exports = {
	
	read:readPackage,
	unpack:unpackFilesF,
	create:createPackage,
	map:map,
	getFile:getFileNice,
	onReady:_=>{},
	isReady:false
	
} ;

process.nextTick(_=>{
	
	getTempDir().then(d=>{
		
		tempDir = d ;
		module.exports.isReady = true ;
		module.exports.onReady() ;
		
	}) ;
	
}) ;