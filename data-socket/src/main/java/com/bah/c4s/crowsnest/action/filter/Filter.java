package com.bah.c4s.crowsnest.action.filter;

import org.json.simple.JSONObject;

import com.bah.c4s.crowsnest.action.Action;
import com.bah.c4s.crowsnest.action.ActionResponse;


public abstract class Filter extends Action{
	
	public Filter(JSONObject actionDefinition) throws Exception{
		super(actionDefinition);
		this.type = ActionResponse.REMOVE;
	}

}
