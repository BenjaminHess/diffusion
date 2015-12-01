package com.bah.c4s.crowsnest.action.alert;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

import com.bah.c4s.crowsnest.action.Action;
import com.bah.c4s.crowsnest.action.ActionResponse;

public abstract class Alert extends Action {
	public static final String FLAGSFIELD = "alert_flags";
	public static final String HIGHEST_ALERT = "highest_alert";
	
	protected AlertLevel level;
	
	public Alert(JSONObject actionDefinition) throws Exception{
		super(actionDefinition);
		this.type = ActionResponse.ALERT;
		String alertLevel = actionDefinition.get("alertLevel").toString();
		this.level = getAlertLevel(alertLevel);
	}
	
	public JSONObject updateAlerts(JSONObject rowJson){
		JSONObject alertJson = new JSONObject();
		alertJson.put("level", this.level.text());
		alertJson.put(Action.ALERTID, this.accumuloId);
		alertJson.put("source", this.author);
		alertJson.put("reason", this.description);
		alertJson.put("entity", this.primaryValue);
		
		JSONArray flags = (JSONArray) rowJson.get(FLAGSFIELD);
		if(flags == null){
			flags = new JSONArray();
		}
		
		flags.add(alertJson);
		rowJson.put(FLAGSFIELD, flags);
		
		Object highestAlert = rowJson.get(HIGHEST_ALERT);
		if(highestAlert == null){
		  rowJson.put(HIGHEST_ALERT, this.level.text());
		} else {
			AlertLevel previousAlertLevel = getAlertLevel(highestAlert.toString());
			if(previousAlertLevel.numeric() < this.level.numeric()){
				rowJson.put(HIGHEST_ALERT, this.level.text());
			}
		}
		return rowJson;
	}
	
	protected AlertLevel getAlertLevel(String text){
		switch(text){
		case "LOW" : return AlertLevel.LOW;
		case "MEDIUM" : return AlertLevel.MEDIUM;
		case "HIGH" : return AlertLevel.HIGH;
		case "VERY HIGH" : return AlertLevel.VERYHIGH;
		default : return AlertLevel.NONE; 
		}
	}
}