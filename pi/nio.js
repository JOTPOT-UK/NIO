let fs = require("fs") ;
let events = require("events") ;

let exported = new Array() ;

let isBusy = false ;
let exportQue = new Array() ;

function accExport(io,callback) {
	
	exported.push(io) ;
	fs.writeFile("/sys/class/gpio/export",String(io),err=>{
		
		if (exportQue.length > 0) {
			
			accExport(...exportQue.shift()) ;
			
		}
		
		else {
			
			isBusy = false ;
			
		}
		
		callback(err) ;
		
	}) ;
	
}

function exportIO(io,callback) {
	
	if (!isBusy) {
		
		isBusy = true ;
		accExport(io,callback) ;
		
	}
	
	else {
		
		exportQue.push([io,callback]) ;
		
	}
	
}

function unexport(io) {
	
	exported.splice(exported.indexOf(io),1) ;
	return new Promise((resolve,reject)=>{
		
		fs.writeFile("/sys/class/gpio/unexport",String(io),err=>{
			
			if (err) {
				
				reject(err) ;
				
			}
			
			else {
				
				resolve() ;
				
			}
			
		}) ;
		
	}) ;
	
}

function unexportSync(io) {
	
	exported.splice(exported.indexOf(io),1) ;
	fs.writeFileSync("/sys/class/gpio/unexport",String(io)) ;
	
}

function unexportAll() {
	
	console.log("Application going to exit... Unexporting all...") ;
	while (typeof exported[0] !== "undefined") {
		
		unexportSync(exported[0]) ;
		
	}
	console.log("Done. Goodbye.") ;
	
}

process.on("exit",unexportAll) ;
process.on("SIGINT",_=>{
	
	unexportAll() ;
	process.exit() ;
	
}) ;
process.on("SIGTERM",_=>{
	
	unexportAll() ;
	process.exit() ;
	
}) ;
process.on("uncaughtException",err=>{
	
	console.warn("uncaughtException") ;
	console.warn(err) ;
	process.exit() ;
	
}) ;

class nio {
	
	constructor (io,ioQ,callback) {
		
		if (typeof callback !== "function") {
			
			callback =_=> {} ;
			
		}
		
		let internals = {
			
			value:0,
			ioQ:ioQ,
			io:io
			
		} ;
		this.internals = internals ;
		exportIO(io,err=>{
			
			if (err) {
				
				callback(err) ;
				
			}
			
			else {
				
				fs.writeFile(`/sys/class/gpio/gpio${io}/direction`,ioQ,err=>{
					
					if (err) {
						
						callback(err) ;
						
					}
					
					else {
						
						fs.readFile(`/sys/class/gpio/gpio${io}/value`,(err,d)=>{
							
							if (err) {
								
								callback(err) ;
								
							}
							
							else {
								
								d = d.toString() ;
								internals.value = Number(d) ;
								
								let lastValue = internals.value ;
								let checkValue =_=> {
									
									if (internals.value !== lastValue) {
										
										this.events.emit(Boolean(internals.value)?"high":"low") ;
										lastValue = internals.value ;
										
									}
									this.getValue().then(_=>process.nextTick(checkValue)) ;
									
								} ;
								process.nextTick(checkValue) ;
								callback(null) ;
								
							}
							
						}) ;
						
					}
					
				}) ;
				
			}
			
		}) ;
		
		this.events = new events() ;
		
	}
	
	set value(val) {
		
		val = Number(val) ;
		if (this.internals.ioQ === "in") {
			
			console.warn("The value of an input cannot be set!") ;
			throw "The value of an input cannot be set!" ;
			
		}
		
		else if (val !== 0 && val !== 1) {
			
			console.warn("Value must be 0 or 1") ;
			throw "Value must be 0 or 1" ;
			
		}
		
		else {
			
			fs.writeFile(`/sys/class/gpio/gpio${this.internals.io}/value`,String(val),err=>{
				
				if (err) {
					
					throw err ;
					
				}
				
			}) ;
			this.internals.value = val ;
			
		}
		
	}
	
	get value() {
		
		return this.internals.value ;
		
	}
	
	getValue() {
		
		return new Promise((resolve,reject)=>{
			
			fs.readFile(`/sys/class/gpio/gpio${this.internals.io}/value`,(err,d)=>{
				
				if (err) {
					
					reject(err) ;
					
				}
				
				else {
					
					d = Number(d.toString()) ;
					this.internals.value = d ;
					resolve(d) ;
					
				}
				
			}) ;
			
		}) ;
		
	}
	
	setValue(val) {
		
		return new Promise((resolve,reject)=>{
			
			val = Number(val) ;
			if (this.internals.ioQ === "in") {
				
				console.warn("The value of an input cannot be set!") ;
				reject("The value of an input cannot be set!") ;
				
			}
			
			else if (val !== 0 && val !== 1) {
				
				console.warn("Value must be 0 or 1") ;
				reject("Value must be 0 or 1") ;
				
			}
			
			else {
				
				fs.writeFile(`/sys/class/gpio/gpio${this.internals.io}/value`,String(val),err=>{
					
					if (err) {
						
						reject(err) ;
						
					}
					
					else {
						
						resolve(val) ;
						
					}
					
				}) ;
				this.internals.value = val ;
				
			}
			
		}) ;
		
	}
	
	unexport() {
		
		return unexport(this.internals.io) ;
		return new Promise((resolve,reject)=>{
			
			fs.writeFile("/sys/class/gpio/unexport",String(this.internals.io),err=>{
				
				if (err) {
					
					reject(err) ;
					
				}
				
				else {
					
					delete this ;
					resolve() ;
					
				}
				
			}) ;
			
		}) ;
		
	}
	
}

class input extends nio {
	
	constructor (io,callback) {
		
		super(io,"in",callback) ;
		
	}
	
}

class output extends nio {
	
	constructor (io,callback) {
		
		super(io,"out",callback) ;
		
	}
	
}

module.exports = {
	
	input:input,
	output:output
	
} ;