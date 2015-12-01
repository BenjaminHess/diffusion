package com.bah.c4s.crowsnest.action.alert;

public enum AlertLevel {

	NONE("NONE",0),
	LOW("LOW",1),
	MEDIUM("MEDIUM",2),
	HIGH("HIGH",3),
	VERYHIGH("VERY HIGH",4);
	
	private String alertString;
	private int numericLevel;
	
	AlertLevel(String text, int number){
		this.alertString = text;
		this.numericLevel = number;
	}
	public String text(){
		return this.alertString;
	}
	
	public int numeric(){
		return this.numericLevel;
	}
}
