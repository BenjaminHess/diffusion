package com.bah.c4s.crowsnest.action;

import org.json.simple.JSONObject;

import com.bah.c4s.crowsnest.action.alert.DetailedAlert;
import com.bah.c4s.crowsnest.action.alert.GenericAlert;
import com.bah.c4s.crowsnest.action.filter.DetailedFilter;
import com.bah.c4s.crowsnest.action.filter.GenericFilter;

public class ActionFactory {

	public static String ACTION_TYPE = "actionType";
	
	
	public static Action createAction(JSONObject json){
		String actionType = json.get(ACTION_TYPE).toString();
		try{
		switch(actionType){
		case "DetailedAlert":
			return new DetailedAlert(json);
		case "GenericAlert":
			return new GenericAlert(json);
		case "DetailedFilter":
			return new DetailedFilter(json);
		case "GenericFilter":
			return new GenericFilter(json);
		default : return null;
		}
		}catch(Exception e){
			return null;
		}
	}
}
