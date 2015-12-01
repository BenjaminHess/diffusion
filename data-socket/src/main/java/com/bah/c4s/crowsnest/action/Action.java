package com.bah.c4s.crowsnest.action;

import java.util.ArrayList;

import org.json.simple.JSONObject;

public abstract class Action {

	public static String USERALERT = "USER";
	public static String ALERTID = "alertId";
	protected String accumuloId;
	protected ActionResponse type;
	protected String author;
	protected String description;
	protected String primaryField;
	protected String listName;
	protected ArrayList<String> subChecks;
	protected String primaryValue;
	protected String source;
	
	public Action(JSONObject actionDef) throws Exception{
		this.accumuloId = actionDef.get("accumuloID").toString();
		this.author = actionDef.get("author").toString();
		this.description = actionDef.get("description").toString();
		this.source = actionDef.get("dataSource").toString();
		Object obj = actionDef.get("primaryField");
		if(obj != null){
		    this.primaryField = obj.toString();	
		} else{
			this.primaryField = null;
		}
		obj = actionDef.get("listName");
		if(obj != null){
			this.listName = obj.toString();	
		} else{
			this.listName = null;
		}
		this.subChecks = ActionUtils.getFilters(actionDef);
		this.primaryValue = ActionUtils.getPrimaryValue(subChecks, this.primaryField);
		
	};
	
	public Action(JSONObject actionDefinition, ActionResponse actionType){
		this.type = actionType;
	}
	public void setAccumuloID(String id){
		this.accumuloId = id;
	}
	public void setAuthor(String author){
		this.author = author;
	}
	public void setDescription(String d){
		this.description = d;
	}
	public abstract ActionResponse process(JSONObject json, String dataSource);
	
	public String getPrimaryValue(){
		return this.primaryValue;
	}
	
	public String getPrimaryField(){
		return this.primaryField;
	}
	public abstract String getEntity();
	public abstract String getEntityDescription();
}